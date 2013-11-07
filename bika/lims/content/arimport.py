import sys
from bika.lims import bikaMessageFactory as _
from bika.lims.browser.widgets import DateTimeWidget
from bika.lims.content.bikaschema import BikaSchema
from bika.lims.config import ManageBika, PROJECTNAME
from bika.lims.interfaces import IARImport
from bika.lims.jsonapi import resolve_request_lookup
from bika.lims.workflow import doActionFor
from bika.lims.utils import tmpID
from AccessControl import ClassSecurityInfo
from DateTime import DateTime
from Products.Archetypes import atapi
from Products.Archetypes.event import ObjectInitializedEvent
from Products.Archetypes.public import *
from Products.Archetypes.references import HoldingReference
from Products.ATContentTypes.content import schemata
from Products.CMFCore import permissions
from Products.CMFCore.utils import getToolByName
from Products.CMFPlone.utils import safe_unicode
from zope import event
from zope.interface import implements

schema = BikaSchema.copy() + Schema((
    StringField('ImportOption',
        widget = StringWidget(
            label = _("Import Option"),
        ),
    ),
    StringField('FileName',
        searchable = True,
        widget = StringWidget(
            label = _("Filename"),
        ),
    ),
    FileField('OriginalFile',
        searchable = True,
        widget = FileWidget(
            label = _("Original File"),
        ),
    ),
    StringField('ClientTitle',
        searchable = True,
        widget = StringWidget(
            label = _("Client Name"),
        ),
    ),
    StringField('ClientPhone',
        widget = StringWidget(
            label = _("Client Phone"),
        ),
    ),
    StringField('ClientFax',
        widget = StringWidget(
            label = _("Client Fax"),
        ),
    ),
    StringField('ClientAddress',
        widget = StringWidget(
            label = _("Client Address"),
        ),
    ),
    StringField('ClientCity',
        widget = StringWidget(
            label = _("Client City"),
        ),
    ),
    StringField('ClientID',
        searchable = True,
        widget = StringWidget(
            label = _("Client ID"),
        ),
    ),
    StringField('ContactID',
        widget = StringWidget(
            label = _("Contact ID"),
        ),
    ),
    StringField('ContactName',
        widget = StringWidget(
            label = _("Contact Name"),
        ),
    ),
    ReferenceField('Contact',
        allowed_types = ('Contact',),
        relationship = 'ARImportContact',
        default_method = 'getContactUIDForUser',
        referenceClass = HoldingReference,
        vocabulary_display_path_bound = sys.maxint,
        widget=ReferenceWidget(
            label=_("Contact"),
            render_own_label=True,
            size=12,
            helper_js=("bika_widgets/referencewidget.js", "++resource++bika.lims.js/contact.js"),
            visible={'edit': 'visible', 'view': 'visible', 'add': 'visible'},
            base_query={'inactive_state': 'active'},
            showOn=True,
            popup_width='300px',
            colModel=[{'columnName': 'UID', 'hidden': True},
                      {'columnName': 'Fullname', 'width': '100', 'label': _('Name')},
                     ],
        ),
    ),
    StringField('ClientEmail',
        widget = StringWidget(
            label = _("Client Email"),
        ),
    ),
    StringField('CCContactID',
        widget = StringWidget(
            label = _("CC Contact ID"),
        ),
    ),
    ReferenceField('CCContact',
        allowed_types = ('Contact',),
        relationship = 'ARImportCCContact',
        default_method = 'getContactUIDForUser',
        referenceClass = HoldingReference,
        widget=ReferenceWidget(
            label=_("Contact"),
            render_own_label=True,
            size=12,
            helper_js=("bika_widgets/referencewidget.js", "++resource++bika.lims.js/contact.js"),
            visible={'edit': 'visible', 'view': 'visible', 'add': 'visible'},
            base_query={'inactive_state': 'active'},
            showOn=True,
            popup_width='300px',
            colModel=[{'columnName': 'UID', 'hidden': True},
                      {'columnName': 'Fullname', 'width': '100', 'label': _('Name')},
                     ],
        ),
    ),
    StringField('CCNamesReport',
        widget = StringWidget(
            label = _("Report Contact Names"),
        ),
    ),
    StringField('CCEmailsReport',
        widget = StringWidget(
            label = _("CC Email - Report"),
        ),
    ),
    StringField('CCEmailsInvoice',
        widget = StringWidget(
            label = _("CC Email - Invoice"),
        ),
    ),
    StringField('OrderID',
        searchable = True,
        widget = StringWidget(
            label = _("Order ID"),
        ),
    ),
    StringField('QuoteID',
        searchable = True,
        widget = StringWidget(
            label = _("QuoteID"),
        ),
    ),
    StringField('SamplePoint',
        searchable = True,
        widget = StringWidget(
            label = _("Sample Point"),
        ),
    ),
    StringField('Temperature',
        widget = StringWidget(
            label = _("Temperature"),
        ),
    ),
    DateTimeField('DateImported',
        required = 1,
        widget = DateTimeWidget(
            label = _("Date Imported"),
            size=12,
            visible={'edit': 'visible', 'view': 'visible', 'add': 'visible',
                     'secondary': 'invisible'},
        ),
    ),
    DateTimeField('DateApplied',
        widget = DateTimeWidget(
            label = _("Date Applied"),
            size=12,
            visible={'edit': 'visible', 'view': 'visible', 'add': 'visible',
                     'secondary': 'invisible'},
        ),
    ),
    IntegerField('NumberSamples',
        widget = IntegerWidget(
            label = _("Number of samples"),
        ),
    ),
    BooleanField('Status',
        searchable = True,
        widget = StringWidget(
            label = _("Status"),
        ),
    ),
    LinesField('Remarks',
        widget = LinesWidget(
            label = _("Remarks"),
        )
    ),
    LinesField('Analyses',
        widget = LinesWidget(
            label = _("Analyses"),
        )
    ),
    ComputedField('ClientUID',
        expression = 'here.aq_parent.UID()',
        widget = ComputedWidget(
            visible = False,
        ),
    ),
),
)

schema['title'].required = False

class ARImport(BaseFolder):
    security = ClassSecurityInfo()
    schema = schema
    displayContentsTab = False
    implements (IARImport)

    #def Title(self):
    #    """ Return the id as title """
    #    return safe_unicode(self.getId()).encode('utf-8')

    security.declarePublic('current_date')
    def current_date(self):
        """ return current date """
        return DateTime()


    # workflow methods
    #
    def workflow_script_submit(self):
        """ submit arimport batch """
        if self.getImportOption() == 's':
            self.submit_arimport_s()
        else:
            self.submit_arimport_c()

    def submit_arimport_c(self):
        """ load the classic import layout """

        ars = []
        samples = []
        valid_batch = True
        client = self.aq_parent
        contact_obj = None
        cc_contact_obj = None

        # validate contact
        for contact in client.objectValues('Contact'):
            if contact.getUsername() == self.getContactID():
                contact_obj = contact
            if self.getCCContactID() == None:
                if contact_obj != None:
                    break
            else:
                if contact.getUsername() == self.getCCContactID():
                    cc_contact_obj = contact
                    if contact_obj != None:
                        break

        if contact_obj == None:
            valid_batch = False

        # get Keyword to ServiceId Map
        services = {}
        for service in self.bika_setup_catalog(
                portal_type = 'AnalysisService'):
            obj = service.getObject()
            keyword = obj.getKeyword()
            if keyword:
                services[keyword] = '%s:%s' % (obj.UID(), obj.getPrice())

        samplepoints = self.bika_setup_catalog(
            portal_type = 'SamplePoint',
            Title = self.getSamplePoint())
        if not samplepoints:
            valid_batch = False

        aritems = self.objectValues('ARImportItem')
        pad = 8192 * ' '
        #REQUEST = self.REQUEST
        #REQUEST.RESPONSE.write(self.progress_bar(REQUEST = REQUEST))
        #REQUEST.RESPONSE.write('<input style="display: none;" id="progressType" value="Analysis request submission">')
        #REQUEST.RESPONSE.write('<input style="display: none;" id="progressDone" value="Completed">')

        #REQUEST.RESPONSE.write(pad + '<input style="display: none;" id="inputTotal" value="%s">' % len(aritems))

        SamplingWorkflowEnabled = \
            self.bika_setup.getSamplingWorkflowEnabled()
        wftool = getToolByName(self, 'portal_workflow')
        row_count = 0
        prefix = 'Sample'
        for aritem in aritems:
            row_count += 1
            # set up analyses
            analyses = []
            for analysis in aritem.getAnalyses(full_objects=True):
                if services.has_key(analysis):
                    analyses.append(services[analysis])
                else:
                    valid_batch = False

            sampletypes = self.portal_catalog(
                portal_type = 'SampleType',
                sortable_title = aritem.getSampleType().lower(),
                )
            sampletype = None
            if not sampletypes:
                valid_batch = False
                return
            sampletypeuid = sampletypes[0].getObject().UID()
            if aritem.getSampleDate():
                date_items = aritem.getSampleDate().split('/')
                sample_date = DateTime(int(date_items[2]), int(date_items[1]), int(date_items[0]))
            else:
                sample_date = None
            sample_id = '%s-%s' % (prefix, tmpID())
            client.invokeFactory(id = sample_id, type_name = 'Sample')
            sample = client[sample_id]
            sample.unmarkCreationFlag()
            sample.edit(
                SampleID = sample_id,
                ClientReference = aritem.getClientRef(),
                ClientSampleID = aritem.getClientSid(),
                SampleType = aritem.getSampleType(),
                DateSampled = sample_date,
                DateReceived = DateTime(),
                )
            sample._renameAfterCreation()
            sp_id = client.invokeFactory('SamplePoint', id=tmpID())
            sp = client[sp_id]
            sp.edit(title=self.getSamplePoint())
            sample.setSamplePoint(self.getSamplePoint())
            sample.setSampleID(sample.getId())
            event.notify(ObjectInitializedEvent(sample))
            sample.at_post_create_script()
            sample_uid = sample.UID()
            samples.append(sample_id)
            aritem.setSample(sample_uid)

            #Create AR
            ar_id = tmpID()
            client.invokeFactory(id = ar_id, type_name = 'AnalysisRequest')
            ar = client[ar_id]
            if aritem.getReportDryMatter().lower() == 'y':
                report_dry_matter = True
            else:
                report_dry_matter = False
            ar.edit(
                RequestID = ar_id,
                Contact = self.getContact(),
                CCContact = self.getCCContact(),
                CCEmails = self.getCCEmailsInvoice(),
                ClientOrderNumber = self.getOrderID(),
                ReportDryMatter = report_dry_matter,
                Analyses = analyses
                )
            ar.setSample(sample_uid)
            sample = ar.getSample()
            ar.setSampleType(sampletypeuid)
            ar_uid = ar.UID()
            aritem.setAnalysisRequest(ar_uid)
            ars.append(ar_id)
            ar.unmarkCreationFlag()
            ar._renameAfterCreation()

            #Add Services
            service_uids = [i.split(':')[0] for i in analyses]
            new_analyses = ar.setAnalyses(service_uids)
            ar.setRequestID(ar.getId())
            ar.reindexObject()
            event.notify(ObjectInitializedEvent(ar))
            ar.at_post_create_script()

            # Create sample partitions
            parts = [{'services': [],
                     'container':[],
                     'preservation':'',
                     'separate':False}]

            parts_and_services = {}
            for _i in range(len(parts)):
                p = parts[_i]
                part_prefix = sample.getId() + "-P"
                if '%s%s' % (part_prefix, _i + 1) in sample.objectIds():
                    parts[_i]['object'] = sample['%s%s' % (part_prefix, _i + 1)]
                    parts_and_services['%s%s' % (part_prefix, _i + 1)] = \
                            p['services']
                else:
                    _id = sample.invokeFactory('SamplePartition', id='tmp')
                    part = sample[_id]
                    parts[_i]['object'] = part
                    container = None
                    preservation = p['preservation']
                    parts[_i]['prepreserved'] = False
                    part.edit(
                        Container=container,
                        Preservation=preservation,
                    )
                    part.unmarkCreationFlag()
                    part._renameAfterCreation()
                    if SamplingWorkflowEnabled:
                        wftool.doActionFor(part, 'sampling_workflow')
                    else:
                        wftool.doActionFor(part, 'no_sampling_workflow')
                    parts_and_services[part.id] = p['services']

            if SamplingWorkflowEnabled:
                wftool.doActionFor(ar, 'sampling_workflow')
            else:
                wftool.doActionFor(ar, 'no_sampling_workflow')

            # Add analyses to sample partitions
            # XXX jsonapi create AR: right now, all new analyses are linked to the first samplepartition
            if new_analyses:
                analyses = list(part.getAnalyses())
                analyses.extend(new_analyses)
                part.edit(
                    Analyses=analyses,
                )
                for analysis in new_analyses:
                    analysis.setSamplePartition(part)

            # If Preservation is required for some partitions,
            # and the SamplingWorkflow is disabled, we need
            # to transition to to_be_preserved manually.
            if not SamplingWorkflowEnabled:
                to_be_preserved = []
                sample_due = []
                lowest_state = 'sample_due'
                for p in sample.objectValues('SamplePartition'):
                    if p.getPreservation():
                        lowest_state = 'to_be_preserved'
                        to_be_preserved.append(p)
                    else:
                        sample_due.append(p)
                for p in to_be_preserved:
                    doActionFor(p, 'to_be_preserved')
                for p in sample_due:
                    doActionFor(p, 'sample_due')
                doActionFor(sample, lowest_state)
                for analysis in ar.objectValues('Analysis'):
                    doActionFor(analysis, lowest_state)
                doActionFor(ar, lowest_state)

            # receive secondary AR
            #TODO if request.get('Sample_id', ''):
            #    doActionFor(ar, 'sampled')
            #    doActionFor(ar, 'sample_due')
            #    not_receive = ['to_be_sampled', 'sample_due', 'sampled',
            #                   'to_be_preserved']
            #    sample_state = wftool.getInfoFor(sample, 'review_state')
            #    if sample_state not in not_receive:
            #        doActionFor(ar, 'receive')
            #    for analysis in ar.getAnalyses(full_objects=1):
            #        doActionFor(analysis, 'sampled')
            #        doActionFor(analysis, 'sample_due')
            #        if sample_state not in not_receive:
            #            doActionFor(analysis, 'receive')

            #REQUEST.RESPONSE.write(pad + '<input style="display: none;" name="inputProgress" value="%s">' % row_count)
        self.setDateApplied(DateTime())
        self.reindexObject()
        #REQUEST.RESPONSE.write('<script>document.location.href="%s?portal_status_message=%s%%20submitted"</script>' % (self.absolute_url(), self.getId()))

    #def submit_arimport_s(self):
    #    """ load the special (benchmark) import layout """

    #    ars = []
    #    samples = []
    #    valid_batch = False
    #    client = self.aq_parent
    #    contact_obj = None
    #    cc_contact_obj = None

    #    # validate contact
    #    for contact in client.objectValues('Contact'):
    #        if contact.getUsername() == self.getContactID():
    #            contact_obj = contact
    #            valid_batch = True
    #            break

    #    # get Keyword to ServiceId Map
    #    services = {}
    #    service_uids = {}

    #    for service in self.bika_setup_catalog(
    #            portal_type = 'AnalysisService'):
    #        obj = service.getObject()
    #        keyword = obj.getKeyword()
    #        if keyword:
    #            services[keyword] = '%s:%s' % (obj.UID(), obj.getPrice())
    #        service_uids[obj.UID()] = '%s:%s' % (obj.UID(), obj.getPrice())
    #    sampletypes = []

    #    profiles = {}

    #    aritems = self.objectValues('ARImportItem')

    #    pad = 8192 * ' '
    #    REQUEST = self.REQUEST
    #    REQUEST.RESPONSE.write(self.progress_bar(REQUEST = REQUEST))
    #    REQUEST.RESPONSE.write('<input style="display: none;" id="progressType" value="Analysis request submission">')
    #    REQUEST.RESPONSE.write('<input style="display: none;" id="progressDone" value="Completed">')
    #    REQUEST.RESPONSE.write(pad + '<input style="display: none;" id="inputTotal" value="%s">' % len(aritems))

    #    row_count = 0
    #    next_id = self.generateUniqueId('Sample', batch_size = len(aritems))
    #    (prefix, next_num) = next_id.split('-')
    #    next_num = int(next_num)
    #    for aritem in aritems:
    #        # set up analyses
    #        ar_profile = None
    #        analyses = []
    #        row_count += 1

    #        for profilekey in aritem.getAnalysisProfile():
    #            this_profile = None
    #            if not profiles.has_key(profilekey):
    #                profiles[profilekey] = []
    #                # there is no profilekey index
    #                l_prox = self.bika_setup_catalog(portal_type = 'AnalysisProfile',
    #                                getProfileKey = profilekey)
    #                if l_prox:
    #                    p = l_prox[0].getObject()
    #                    profiles[profilekey] = [s.UID() for s in p.getService()]
    #                    this_profile = p
    #                else:
    #                    # there is no profilekey index
    #                    c_prox = self.bika_setup_catalog(portal_type = 'AnalysisProfile',
    #                                getClientUID = client.UID(),
    #                                getProfileKey = profilekey)
    #                    if c_prox:
    #                        p = c_prox[0].getObject()
    #                        profiles[profilekey] = [s.UID() for s in p.getService()]
    #                        this_profile = p

    #            if ar_profile is None:
    #                ar_profile = p
    #            else:
    #                ar_profile = None
    #            profile = profiles[profilekey]
    #            for analysis in profile:
    #                if not service_uids.has_key(analysis):
    #                    service = tool.lookupObject(analysis)
    #                    keyword = service.getKeyword()
    #                    service_uids[obj.UID()] = '%s:%s' % (obj.UID(), obj.getPrice())
    #                    if keyword:
    #                        services[keyword] = '%s:%s' % (obj.UID(), obj.getPrice())

    #                if service_uids.has_key(analysis):
    #                    if not service_uids[analysis] in analyses:
    #                        analyses.append(service_uids[analysis])
    #                else:
    #                    valid_batch = False

    #        for analysis in aritem.getAnalyses(full_objects=True):
    #            if not services.has_key(analysis):
    #                for service in self.bika_setup_catalog(
    #                        portal_type = 'AnalysisService',
    #                        getKeyword = analysis):
    #                    obj = service.getObject()
    #                    services[analysis] = '%s:%s' % (obj.UID(), obj.getPrice())
    #                    service_uids[obj.UID()] = '%s:%s' % (obj.UID(), obj.getPrice())

    #            if services.has_key(analysis):
    #                analyses.append(services[analysis])
    #            else:
    #                valid_batch = False

    #        sampletype = aritem.getSampleType()
    #        if not sampletype in sampletypes:
    #            for s in self.bika_setup_catalog(portal_type = 'SampleType',
    #                            Title = sampletype):
    #                sampletypes.append(s.Title)


    #        if not sampletype in sampletypes:
    #            valid_batch = False

    #        if aritem.getSampleDate():
    #            date_items = aritem.getSampleDate().split('/')
    #            sample_date = DateTime(int(date_items[2]), int(date_items[0]), int(date_items[1]))
    #        else:
    #            sample_date = None
    #        sample_id = '%s-%s' % (prefix, (str(next_num)).zfill(5))
    #        client.invokeFactory(id = sample_id, type_name = 'Sample')
    #        next_num += 1
    #        sample = client[sample_id]
    #        sample.edit(
    #            SampleID = sample_id,
    #            ClientReference = aritem.getClientRef(),
    #            ClientSampleID = aritem.getClientSid(),
    #            SampleType = sampletype,
    #            DateSampled = sample_date,
    #            DateReceived = DateTime(),
    #            Remarks = aritem.getClientRemarks(),
    #            )
    #        sample.processForm()
    #        sample_uid = sample.UID()
    #        aritem.setSample(sample_uid)

    #        ar_id = self.generateARUniqueId('AnalysisRequest', sample_id, 1)
    #        client.invokeFactory(id = ar_id, type_name = 'AnalysisRequest')
    #        ar = client[ar_id]
    #        report_dry_matter = False

    #        ar.edit(
    #            RequestID = ar_id,
    #            Contact = self.getContact(),
    #            CCEmails = self.getCCEmails(),
    #            ReportDryMatter = report_dry_matter,
    #            Sample = sample_uid,
    #            Profile = ar_profile,
    #            ClientOrderNumber = self.getOrderID(),
    #            Remarks = aritem.getClientRemarks(),
    #            Analyses = analyses,
    #            )
    #        ar.processForm()
    #        ar_uid = ar.UID()
    #        aritem.setAnalysisRequest(ar_uid)
    #        ars.append(ar_id)
    #        REQUEST.RESPONSE.write(pad + '<input style="display: none;" name="inputProgress" value="%s">' % row_count)

    #    self.setDateApplied(DateTime())
    #    self.reindexObject()
    #    REQUEST.RESPONSE.write('<script>document.location.href="%s?portal_status_message=%s%%20submitted"</script>' % (self.absolute_url(), self.getId()))

    security.declarePublic('getContactUIDForUser')
    def getContactUIDForUser(self):
        """ get the UID of the contact associated with the authenticated
            user
        """
        user = self.REQUEST.AUTHENTICATED_USER
        user_id = user.getUserName()
        r = self.portal_catalog(
            portal_type = 'Contact',
            getUsername = user_id
        )
        if len(r) == 1:
            return r[0].UID


    def validateIt(self):
        rc = getToolByName(self, 'reference_catalog')
        pc = getToolByName(self, 'portal_catalog')
        client = self.aq_parent
        batch_remarks = []
        valid_batch = True
        uid = self.UID()
        batches = pc({
                    'portal_type': 'ARImport', 
                    'path': {'query': '/'.join(client.getPhysicalPath())},
                    })
        for brain in batches:
            if brain.UID == uid:
                continue
            batch = brain.getObject()
            if batch.getOrderID() != self.getOrderID():
                continue
            if batch.getStatus():
                # then a previous valid batch exists
                batch_remarks.append(
                    '\n' + 'Duplicate order %s' % self.getOrderID())
                valid_batch = False
                break

        # validate client
        if self.getClientID() != client.getClientID():
            batch_remarks.append(
                '\n' + 'Client ID should be %s' %client.getClientID())
            valid_batch = False

        # validate contact
        contact_found = False 
        cc_contact_found = False 

        if self.getContact():
            contact_found = True
        else:
            contactid = self.getContactID()
            for contact in client.objectValues('Contact'):
                if contact.getUsername() == contactid:
                    self.edit(Contact=contact)
                    contact_found = True
                    #break

        if self.getCCContact():
            cc_contact_found = True
        else:
            if self.getCCContactID():
                cccontact_uname = self.getCCContactID()
                for contact in client.objectValues('Contact'):
                    if contact.getUsername() == cccontact_uname:
                        self.edit(CCContact=contact)
                        cc_contact_found = True
                        break

        cccontact_uname = self.getCCContactID()

        if not contact_found:
            batch_remarks.append('\n' + 'Contact invalid')
            valid_batch = False
        if cccontact_uname != None and \
           cccontact_uname != '':
            if not cc_contact_found:
                batch_remarks.append('\n' + 'CC contact invalid')
                valid_batch = False

        # validate sample point
        samplepoint = self.getSamplePoint()
        if samplepoint != None:
            r = pc(portal_type='SamplePoint', 
                Title=samplepoint)
            if len(r) == 0:
                batch_remarks.append('\n' + 'New Sample point will be added')

        sampletypes = \
            [p.Title for p in pc(portal_type="SampleType")]
        service_keys = []
        dependant_services = {}

        bsc = getToolByName(self, 'bika_setup_catalog')
        services = bsc(portal_type = "AnalysisService",
                       inactive_state = 'active')
        for brain in services:
            service = brain.getObject()
            service_keys.append(service.getKeyword())
            calc = service.getCalculation()
            if calc:
                dependencies = calc.getDependentServices()
                if dependencies:
                    dependant_services[service.getKeyword()] = dependencies
        aritems = self.objectValues('ARImportItem')
        for aritem in aritems:
            item_remarks = []
            valid_item = True
            if aritem.getSampleType() not in sampletypes:
                batch_remarks.append('\n' + '%s: Sample type %s invalid' %(aritem.getSampleName(), aritem.getSampleType()))
                item_remarks.append('\n' + 'Sample type %s invalid' %(aritem.getSampleType()))
                valid_item = False
            #validate Sample Date
            try:
                date_items = aritem.getSampleDate().split('/')
                test_date = DateTime(int(date_items[2]), int(date_items[1]), int(date_items[0]))
            except:
                valid_item = False
                batch_remarks.append('\n' + '%s: Sample date %s invalid' %(aritem.getSampleName(), aritem.getSampleDate()))
                item_remarks.append('\n' + 'Sample date %s invalid' %(aritem.getSampleDate()))

            if self.getImportOption() == 'c':
                analyses = aritem.getAnalyses()
                for analysis in analyses:
                    if analysis not in service_keys:
                        batch_remarks.append('\n' + '%s: Analysis %s invalid' %(aritem.getSampleName(), analysis))
                        item_remarks.append('\n' + 'Analysis %s invalid' %(analysis))
                        valid_item = False
                    # validate analysis dependancies
                    reqd_analyses = []
                    if dependant_services.has_key(analysis):
                        reqd_analyses = \
                            [s.getKeyword() for s in dependant_services[analysis]]
                    reqd_titles = ''
                    for reqd in reqd_analyses:
                        if (reqd not in analyses):
                            if reqd_titles != '':
                                reqd_titles += ', '
                            reqd_titles += reqd
                    if reqd_titles != '':
                        valid_item = False
                        batch_remarks.append('\n' + '%s: %s needs %s' \
                            %(aritem.getSampleName(), analysis, reqd_titles))
                        item_remarks.append('\n' + '%s needs %s' \
                            %(analysis, reqd_titles))

                # validate analysisrequest dependancies
                if aritem.getReportDryMatter().lower() == 'y':
                    required = self.get_analysisrequest_dependancies('DryMatter')
                    reqd_analyses = required['keys']
                    reqd_titles = ''
                    for reqd in reqd_analyses:
                        if reqd not in analyses:
                            if reqd_titles != '':
                                reqd_titles += ', '
                            reqd_titles += reqd

                    if reqd_titles != '':
                        valid_item = False
                        batch_remarks.append('\n' + '%s: Report as Dry Matter needs %s' \
                            %(aritem.getSampleName(), reqd_titles))
                        item_remarks.append('\n' + 'Report as Dry Matter needs %s' \
                            %(reqd_titles))

            aritem.setRemarks(item_remarks)
            if not valid_item:
                valid_batch = False
        if self.getNumberSamples() != len(aritems):
            valid_batch = False
            batch_remarks.append('\nNumber of samples specified (%s) does no match number listed (%s)' % (self.getNumberSamples(), len(aritems)))
        self.edit(
            Remarks=batch_remarks,
            Status=valid_batch)

        return valid_batch

atapi.registerType(ARImport, PROJECTNAME)

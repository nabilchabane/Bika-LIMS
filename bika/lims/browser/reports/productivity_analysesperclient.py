from AccessControl import getSecurityManager
from DateTime import DateTime
from Products.CMFCore.utils import getToolByName
from bika.lims.browser import BrowserView
from Products.Five.browser.pagetemplatefile import ViewPageTemplateFile
from bika.lims import bikaMessageFactory as _
from bika.lims.browser.client import ClientSamplesView
from bika.lims.utils import formatDateQuery, formatDateParms, logged_in_client
from bika.lims.interfaces import IReportFolder
from plone.app.content.browser.interfaces import IFolderContentsView
from plone.app.layout.globals.interfaces import IViewView
from zope.interface import implements
import json
import plone

class Report(BrowserView):
    implements(IViewView)
    template = ViewPageTemplateFile("templates/report_out.pt")

    def __init__(self, context, request, report=None):
        self.report = report
        BrowserView.__init__(self, context, request)

    def __call__(self):
        # get all the data into datalines

        pc = getToolByName(self.context, 'portal_catalog')
        bac = getToolByName(self.context, 'bika_analysis_catalog')
        bc = getToolByName(self.context, 'bika_catalog')
        rc = getToolByName(self.context, 'reference_catalog')

        self.report_content = {}
        parm_lines = {}
        parms = []
        headings = {}        
        count_all_ars = 0
        count_all_analyses = 0
        query = {}

        this_client = logged_in_client(self.context)

        if not this_client and self.request.form.has_key('ClientUID'):
            client_uid = self.request.form['ClientUID']
            this_client = rc.lookupObject(client_uid)
            parms.append(
                { 'title': _('Client'),
                 'value': this_client.Title(),
                 'type': 'text'})

        if this_client:
            headings['header'] = _("Analysis requests and analyses")
            headings['subheader'] = _("Number of Analysis requests and analyses")
        else:
            headings['header'] = _("Analysis requests and analyses per client")
            headings['subheader'] = _("Number of Analysis requests and analyses per client")

        date_query = formatDateQuery(self.context, 'Requested')
        if date_query:
            query['created'] = date_query
            requested = formatDateParms(self.context, 'Requested')
        else:
            requested = 'Undefined'
        parms.append(
            { 'title': _('Requested'),
             'value': requested,
             'type': 'text'})

        workflow = getToolByName(self.context, 'portal_workflow')
        if self.request.form.has_key('bika_analysis_workflow'):
            query['review_state'] = self.request.form['bika_analysis_workflow']
            review_state = workflow.getTitleForStateOnType(self.request.form['bika_analysis_workflow'], 'Analysis')
            parms.append({'title': _('Status'), 'value': review_state, 'type': 'text'})

        if self.request.form.has_key('bika_cancellation_workflow'):
            query['cancellation_state'] = self.request.form['bika_cancellation_workflow']
            cancellation_state = workflow.getTitleForStateOnType(
                        self.request.form['bika_cancellation_workflow'], 'Analysis')
            parms.append({'title': _('Active'), 'value': cancellation_state, 'type': 'text'})

        if self.request.form.has_key('bika_worksheetanalysis_workflow'):
            query['worksheetanalysis_review_state'] = self.request.form['bika_worksheetanalysis_workflow']
            ws_review_state = workflow.getTitleForStateOnType(
                        self.request.form['bika_worksheetanalysis_workflow'], 'Analysis')
            parms.append({'title': _('Assigned to worksheet'), 'value': ws_review_state, 'type': 'text'})
        
        if self.request.form.has_key('bika_worksheetanalysis_workflow'):
            query['worksheetanalysis_review_state'] = self.request.form['bika_worksheetanalysis_workflow']
            ws_review_state = workflow.getTitleForStateOnType(
                        self.request.form['bika_worksheetanalysis_workflow'], 'Analysis')
            parms.append({'title': _('Assigned to worksheet'), 'value': ws_review_state, 'type': 'text'})
        
        # and now lets do the actual report lines
        formats = {'columns': 3,
                   'col_heads': [ _('Client'),
                                  _('Number of requests'),
                                  _('Number of analyses')],
                   'class': ''}

        datalines = []

        if this_client:
            c_proxies = pc(portal_type="Client", UID=this_client.UID())
        else:
            c_proxies = pc(portal_type="Client", sort_on='sortable_title')

        for client in c_proxies:
            query['getClientUID'] = client.UID
            dataline = [{'value': client.Title },]
            query['portal_type'] = 'AnalysisRequest'
            ars = bc(query)
            count_ars = len(ars)
            dataitem = {'value': count_ars}
            dataline.append(dataitem)

            query['portal_type'] = 'Analysis'
            analyses = bac(query)
            count_analyses = len(analyses)
            dataitem = {'value': count_analyses }
            dataline.append(dataitem)


            datalines.append(dataline)

            count_all_analyses += count_analyses
            count_all_ars += count_ars

        # footer data
        footlines = []
        if not this_client:
            footline = []
            footitem = {'value': _('Total'),
                        'class': 'total_label'}
            footline.append(footitem)

            footitem = {'value': count_all_ars}
            footline.append(footitem)
            footitem = {'value': count_all_analyses}
            footline.append(footitem)

            footlines.append(footline)


        self.report_content = {
                'headings': headings,
                'parms': parms,
                'formats': formats,
                'datalines': datalines,
                'footings': footlines}


        return {'report_title': self.context.translate(headings['header']),
                'report_data': self.template()}


import sys
from AccessControl import ClassSecurityInfo
from bika.lims import bikaMessageFactory as _
from bika.lims.browser.widgets.datetimewidget import DateTimeWidget
from bika.lims.content.bikaschema import BikaSchema
from bika.lims.config import PROJECTNAME
from bika.lims.interfaces import IARImportItem
from Products.ATContentTypes.content import schemata
from Products.Archetypes import atapi
from Products.Archetypes.public import *
from Products.Archetypes.references import HoldingReference
from Products.CMFCore.utils import getToolByName
from Products.CMFCore import permissions
from Products.CMFPlone.utils import safe_unicode
from zope.interface import implements

schema = BikaSchema.copy() + Schema((
    StringField('SampleName',
        widget = StringWidget(
            label = _("Sample"),
        )
    ),
    StringField('ClientRef',
        widget = StringWidget(
            label = _("Client Ref"),
        )
    ),
    StringField('ClientRemarks',
        widget = StringWidget(
            label = _("Client Remarks"),
        )
    ),
    StringField('ClientSid',
        widget = StringWidget(
            label = _("Client SID"),
        )
    ),
    ReferenceField('SampleType',
        required=1,
        vocabulary_display_path_bound=sys.maxsize,
        allowed_types=('SampleType',),
        relationship='ARImportItemSampleType',
        referenceClass=HoldingReference,
        mode="rw",
        read_permission=permissions.View,
        write_permission=permissions.ModifyPortalContent,
        widget=ReferenceWidget(
            label=_("Sample Type"),
            render_own_label=False,
            visible={'edit': 'visible',
                     'view': 'visible',
                     'add': 'visible'},
            catalog_name='bika_setup_catalog',
            base_query={'inactive_state': 'active'},
            showOn=True,
        ),
    ),
    DateTimeField('SampleDate',
        mode="rw",
        read_permission=permissions.View,
        write_permission=permissions.ModifyPortalContent,
        widget = DateTimeWidget(
            label=_("Sample Date"),
            visible={'edit': 'visible',
                     'view': 'visible'},
            render_own_label=False,
        ),
    ),
    StringField('NoContainers',
        widget = StringWidget(
            label = _("No of containers"),
        )
    ),
    StringField('PickingSlip',
        widget = StringWidget(
            label = _("Picking Slip"),
        )
    ),
    ReferenceField('ContainerType',
        required = 0,
        allowed_types = ('ContainerType',),
        vocabulary = 'ContainerTypesVocabulary',
        relationship = 'ARImportItemContainerType',
        widget = ReferenceWidget(
            checkbox_bound = 0,
            label = _("Container Type"),
        ),
    ),
    StringField('ReportDryMatter',
        widget = StringWidget(
            label = _("Report as Dry Matter"),
        )
    ),
    StringField('Priority',
        widget = StringWidget(
            label = _("Priority"),
        )
    ),
    ReferenceField(
        'AnalysisProfiles',
        required = 0,
        multiValued = 1,
        allowed_types=('AnalysisProfile',),
        referenceClass=HoldingReference,
        relationship='ARItemAnalysisProfiles',
        mode="rw",
        read_permission=permissions.View,
        write_permission=permissions.ModifyPortalContent,
        widget=ReferenceWidget(
            label=_("Analysis Profiles"),
            size=20,
            render_own_label=False,
            visible={'edit': 'visible',
                     'view': 'visible',
                     'add': 'visible',
                     'secondary': 'invisible'},
            catalog_name='bika_setup_catalog',
            base_query={'inactive_state': 'active'},
            showOn=True,
        ),
    ),
    ReferenceField(
        'Analyses',
        required = 0,
        multiValued = 1,
        allowed_types=('AnalysisService',),
        referenceClass=HoldingReference,
        relationship='ARItemAnalyses',
        mode="rw",
        read_permission=permissions.View,
        write_permission=permissions.ModifyPortalContent,
        widget=ReferenceWidget(
            label=_("Analyses"),
            size=20,
            render_own_label=False,
            visible={'edit': 'visible',
                     'view': 'visible',
                     'add': 'visible',
                     'secondary': 'invisible'},
            catalog_name='bika_setup_catalog',
            base_query={'inactive_state': 'active'},
            showOn=True,
        ),
    ),
    LinesField('Remarks',
        widget = LinesWidget(
            label = _("Remarks"),
            visible = {'edit':'hidden'},
        )
    ),
    ReferenceField('AnalysisRequest',
        allowed_types = ('AnalysisRequest',),
        relationship = 'ARImportItemAnalysisRequest',
        widget = ReferenceWidget(
            label = _("AnalysisProfile Request"),
            visible = {'edit':'hidden'},
        ),
    ),
    ReferenceField('Sample',
        allowed_types = ('Sample',),
        relationship = 'ARImportItemSample',
        widget = ReferenceWidget(
            label = _("Sample"),
            visible = {'edit':'hidden'},
        ),
    ),
),
)

class ARImportItem(BaseContent):
    security = ClassSecurityInfo()
    implements (IARImportItem)
    schema = schema
    displayContentsTab = False

    def Title(self):
        """ Return the Product as title """
        return safe_unicode(self.getSampleName()).encode('utf-8')


    # Sample Type strings need to be converted to objects
    def setSampleType(self, value, **kw):
        """ Accept Title or UID, and convert SampleType title to UID
        before saving.
        """
        bsc = getToolByName(self, 'bika_setup_catalog')
        sampletypes = bsc(portal_type='SampleType', title=value)
        if sampletypes:
            value = sampletypes[0].UID
        else:
            sampletypes = bsc(portal_type='SampleType', UID=value)
            if sampletypes:
                value = sampletypes[0].UID
            else:
                value = None
        return self.Schema()['SampleType'].set(self, value)

    # Container Type strings need to be converted to objects
    def setContainerType(self, value, **kw):
        """ Accept Title or UID, and convert title to UID
        before saving.
        """
        bsc = getToolByName(self, 'bika_setup_catalog')
        types = bsc(portal_type='ContainerType', title=value)
        if types:
            value = types[0].UID
        else:
            types = bsc(portal_type='ContainerType', UID=value)
            if types:
                value = types[0].UID
            else:
                value = None
        return self.Schema()['ContainerType'].set(self, value)

    def ContainerTypesVocabulary(self):
        from bika.lims.content.containertype import ContainerTypes
        return ContainerTypes(self, allow_blank=True)

    # Profile strings need to be converted to objects
    def setAnalysisProfiles(self, values, **kw):
        """ Accept Title or UID, and convert Profiles title to UID
        before saving.
        """
        bsc = getToolByName(self, 'bika_setup_catalog')
        new_values = []
        for value in values:
            profile = self._findProfileKey(value)
            if profile:
                new_values.append(profile.UID())
            else:
                profiles = bsc(portal_type='AnalysisProfile', UID=value)
                if profiles:
                    new_values.append(profiles[0].UID)
        return self.Schema()['AnalysisProfiles'].set(self, new_values)

    def _findProfileKey(self, key):
        profiles = self.bika_setup_catalog(
                portal_type = 'AnalysisProfile')
        for brain in profiles:
            if brain.getObject().getProfileKey() == key:
                return brain.getObject()

    def setAnalyses(self, values, **kw):
        """ Accept Titles or UIDs, and convert analysis title to UID
        before saving.
        """
        bsc = getToolByName(self, 'bika_setup_catalog')
        new_values = []
        for value in values:
            analyses = bsc(portal_type='AnalysisService', getKeyword=value)
            if analyses:
                new_values.append(analyses[0].UID)
            else:
                analyses = bsc(portal_type='AnalysisService', UID=value)
                if analyses:
                    new_values.append(analyses[0].UID)
        return self.Schema()['Analyses'].set(self, new_values)

atapi.registerType(ARImportItem, PROJECTNAME)

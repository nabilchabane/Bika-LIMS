import sys
from AccessControl import ClassSecurityInfo
from bika.lims import bikaMessageFactory as _
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
    StringField('SampleDate',
        widget = StringWidget(
            label = _("Sample Date"),
        )
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
    StringField('ContainerType',
        widget = StringWidget(
            label = _("Container Type"),
        )
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
    LinesField('AnalysisProfile',
        widget = LinesWidget(
            label = _("Analysis Profile"),
        )
    ),
    LinesField('Analyses',
        widget = LinesWidget(
            label = _("Analyses"),
        )
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

atapi.registerType(ARImportItem, PROJECTNAME)

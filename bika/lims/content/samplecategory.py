import sys
from AccessControl import ClassSecurityInfo
from bika.lims import bikaMessageFactory as _
from bika.lims.config import PROJECTNAME
from bika.lims.browser.widgets import RecordsWidget
from bika.lims.content.bikaschema import BikaSchema
from bika.lims.content.sampletype import SampleTypes
from bika.lims.idserver import renameAfterCreation
from Products.Archetypes.public import *
from Products.Archetypes.references import HoldingReference
from Products.ATExtensions.ateapi import RecordsField as RecordsField
from Products.CMFCore.permissions import ModifyPortalContent, View
from Products.CMFCore.utils import getToolByName
from zope.interface import implements

schema = BikaSchema.copy() + Schema((
    ReferenceField('SampleTypes',
        required = 0,
        multiValued = 1,
        allowed_types = ('SampleType',),
        vocabulary = 'SampleTypesVocabulary',
        relationship = 'SamplePointSampleType',
        widget = ReferenceWidget(
            checkbox_bound = 0,
            label = _("Sample Types"),
            description = _("The list of sample types that can be collected "
                            "at this sample point.  If no sample types are "
                            "selected, then all sample types are available."),
        ),
    ),
    ComputedField(
        'SampleTypeTitle',
        expression="[o.Title() for o in context.getSampleTypes()]",
        widget = ComputedWidget(
            visibile=False,
        )
    ),

))

schema['description'].schemata = 'default'
schema['description'].widget.visible = True

class SampleCategory(BaseFolder):
    security = ClassSecurityInfo()
    displayContentsTab = False
    schema = schema

    _at_rename_after_creation = True
    def _renameAfterCreation(self, check_auto_id=False):
        renameAfterCreation(self)

    def SampleTypesVocabulary(self):
        return SampleTypes(self, allow_blank=False)

    def setSampleTypes(self, value, **kw):
        """ For the moment, we're manually trimming the
            sampletype<>samplecategory relation to be equal on both sides, here.
            It's done strangely, because it may be required to behave strangely.
        """
        bsc = getToolByName(self, 'bika_setup_catalog')
        ## convert value to objects
        if value and type(value) == str:
            value = [bsc(UID=value)[0].getObject(),]
        elif value and type(value) in (list, tuple) and type(value[0]) == str:
            value = [bsc(UID=uid)[0].getObject() for uid in value if uid]
        if not type(value) in (list, tuple):
            value = [value,]
        ## Find all SampleTypes that were removed
        existing = self.Schema()['SampleTypes'].get(self)
        removed = existing and [s for s in existing if s not in value] or []
        added = value and [s for s in value if s not in existing] or []
        ## Set it
        #print 'SampleCat %s: set Types: %s' % (self.Title(),
        #    '; '.join([v.Title() for v in value]))
        ret = self.Schema()['SampleTypes'].set(self, value)

        for st in removed:
            samplepoints = st.getSampleCategories()
            if self in samplepoints:
                samplepoints.remove(self)
                st.setSampleCategories(samplepoints)

        for st in added:
            st.setSampleCategories(list(st.getSampleCategories()) + [self,])

        return ret

    def getSampleTypes(self, **kw):
        return self.Schema()['SampleTypes'].get(self)


registerType(SampleCategory, PROJECTNAME)

def SampleCategories(self, instance=None, allow_blank=False):
    instance = instance or self
    bsc = getToolByName(instance, 'bika_setup_catalog')
    items = []
    for sm in bsc(portal_type='SampleCategory',
                  inactive_state='active',
                  sort_on = 'sortable_title'):
        items.append((sm.UID, sm.Title))
    items = allow_blank and [['','']] + list(items) or list(items)
    return DisplayList(items)

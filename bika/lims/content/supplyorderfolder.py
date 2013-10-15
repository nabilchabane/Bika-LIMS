from Products.ATContentTypes.content import schemata
from Products.Archetypes import atapi

from AccessControl import ClassSecurityInfo

from plone.app.folder import folder

from zope.interface import implements

from bika.lims.interfaces import ISupplyOrderFolder, IHaveNoBreadCrumbs
from bika.lims.config import PROJECTNAME


schema = folder.ATFolderSchema.copy()
schema['id'].widget.visible = {'edit':'hidden', 'view':'invisible'}
schema['title'].widget.visible = {'edit':'hidden', 'view':'invisible'}


class SupplyOrderFolder(folder.ATFolder):
    implements(ISupplyOrderFolder, IHaveNoBreadCrumbs)
    displayContentsTab = False
    schema = schema
    security = ClassSecurityInfo()


schemata.finalizeATCTSchema(schema, folderish=True, moveDiscussion=False)

atapi.registerType(SupplyOrderFolder, PROJECTNAME)

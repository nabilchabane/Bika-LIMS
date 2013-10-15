from bika.lims import bikaMessageFactory as _
from bika.lims.browser.bika_listing import BikaListingView
from bika.lims.permissions import AddInvoice
from bika.lims.permissions import ManageInvoices
from plone.app.content.browser.interfaces import IFolderContentsView
from Products.CMFCore.utils import getToolByName
from zope.interface import implements


class SupplyOrderFolderView(BikaListingView):

    implements(IFolderContentsView)

    def __init__(self, context, request):
        super(SupplyOrderFolderView, self).__init__(context, request)
        self.catalog = "portal_catalog"
        self.contentFilter = {'portal_type': 'SupplyOrder'}
        self.icon = self.portal_url + "/++resource++bika.lims.images/product_big.png"
        self.title = _("Supply Orders")
        self.description = ""
        self.show_sort_column = False
        self.show_select_row = False
        self.show_select_all_checkbox = False
        self.show_select_column = False
        self.pagesize = 25
        request.set('disable_border', 1)
        self.columns = {
            'title': {'title': _('Title')},
            'client': {'title': _('Client')},
            'orderdate': {'title': _('Order Date')},
            'datedispatched': {'title': _('Date Dispatched')},
        }
        self.review_states = [{
            'id': 'default',
            'contentFilter': {'review_state':'pending'},
            'title': _('Pending'),
            'transitions': [],
            'columns': ['title', 'client', 'orderdate', 'datedispatched'],
        }, {
            'id': 'dispatched',
            'contentFilter': {'review_state':'dispatched'},
            'title': _('Dispatched'),
            'transitions': [],
            'columns': ['title', 'client', 'orderdate', 'datedispatched'],
        }]

    def folderitems(self):
        items = BikaListingView.folderitems(self)
        for item in items:
            obj = item['obj']
            title_link = "<a href='%s'>%s</a>" % (item['url'], item['title'])
            item['replace']['title'] = title_link
            client = obj.aq_parent
            client_link = "<a href='%s'>%s</a>" % (
                client.absolute_url(), client.Title()
            )
            item['replace']['client'] = client_link
            item['orderdate'] = self.ulocalized_time(obj.getOrderDate())
            item['datedispatched'] = self.ulocalized_time(obj.getDateDispatched())
        return items

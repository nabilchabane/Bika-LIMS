from DateTime import DateTime


def AfterTransitionEventHandler(instance, event):

    action_id = event.transition.id

    instance.setDateDispatched(DateTime())
    instance.reindexObject()

    return

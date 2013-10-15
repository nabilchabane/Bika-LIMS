from DateTime import DateTime


def AfterTransitionEventHandler(instance, event):

	if event.transition:
		action_id = event.transition.id

		if action_id is 'dispatch':
			instance.setDateDispatched(DateTime())
			instance.reindexObject()

	return

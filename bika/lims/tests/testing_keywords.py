class Keywords(object):
    """Robot Framework keyword library
    """

    def resource_filename(self):
        import pkg_resources
        res = pkg_resources.resource_filename("bika.lims", "tests")
        return res

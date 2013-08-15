from google.appengine.ext import db

class AugmentedModel(db.Model):
    @classmethod
    def get_by_properties(self, properties):
        matches = self.all()
        for p,v in properties.iteritems():
            matches.filter(p, v)
        return matches.get()

class User(AugmentedModel):
    name = db.StringProperty()

class Reading(AugmentedModel):
    user = db.IntegerProperty()
    feed = db.IntegerProperty()

class Unread(AugmentedModel):
    user = db.IntegerProperty()
    article = db.IntegerProperty()

class Star(AugmentedModel):
    user = db.IntegerProperty()
    article = db.IntegerProperty()

class Article(AugmentedModel):
    title = db.StringProperty()
    url = db.StringProperty()
    content = db.TextProperty()
    date = db.DateTimeProperty()
    feed = db.IntegerProperty()

class Feed(AugmentedModel):
    title = db.StringProperty()
    url = db.StringProperty()
    description = db.TextProperty()
    language = db.StringProperty()

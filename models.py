from google.appengine.ext import db

# Model -> JSON coder (http://stackoverflow.com/questions/1531501/json-serialization-of-google-app-engine-models)
import time
import datetime
SIMPLE_TYPES = (int, long, float, bool, dict, basestring, list)

def toJSON(model):
    output = {}
    for key, prop in model.properties().iteritems():
        value = getattr(model, key)
        if value is None or isinstance(value, SIMPLE_TYPES):
            output[key] = value
        elif isinstance(value, datetime.date):
            # Convert date/datetime to MILLISECONDS-since-epoch (JS "new Date()").
            ms = time.mktime(value.utctimetuple()) * 1000
            ms += getattr(value, 'microseconds', 0) / 1000
            output[key] = int(ms)
        elif isinstance(value, db.GeoPt):
            output[key] = {'lat': value.lat, 'lon': value.lon}
        elif isinstance(value, db.Model):
            output[key] = to_dict(value)
        else:
            raise ValueError('cannot encode ' + repr(prop))
    return output

class AugmentedModel(db.Model):
    @classmethod
    def get_by_properties(self, properties):
        matches = self.all()
        for p,v in properties.iteritems():
            matches.filter(p, v)
        return matches.get()

    def json(self):
        return dict(toJSON(self).items() + {'id': self.key().id()}.items())

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
    url = db.StringProperty() # url of the feed (XML)
    description = db.TextProperty()
    language = db.StringProperty()
    link = db.StringProperty() # usually a link to the main website

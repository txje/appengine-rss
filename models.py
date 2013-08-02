from google.appengine.ext import db

class User(db.Model):
    name = db.StringProperty()

class Reading(db.Model):
    user = db.IntegerProperty()
    feed = db.IntegerProperty()

class Unread(db.Model):
    user = db.IntegerProperty()
    article = db.IntegerProperty()

class Article(db.Model):
    title = db.StringProperty()
    url = db.StringProperty()
    content = db.TextProperty()
    date = db.DateTimeProperty()

class Feed(db.Model):
    title = db.StringProperty()
    url = db.StringProperty()
    description = db.TextProperty()
    language = db.StringProperty()
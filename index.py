#!/usr/bin/env python

from google.appengine.api import users
import webapp2
from google.appengine.ext.webapp import template
import models
import datetime
import json
import logging
from google.appengine.api import urlfetch
from xml.etree import ElementTree # XML parsing
from google.appengine.ext import db

class DefaultHandler(webapp2.RequestHandler):
    def auth(self):
        logged_in_user = users.get_current_user()
        if logged_in_user:
            # for Google accounts only (that's all we're using)
            local_user = models.User.get_by_properties({"google_id": logged_in_user.user_id()})
            # create new users implicitly
            if local_user is None:
                local_user = models.User(name = logged_in_user.nickname(), google_id = logged_in_user.user_id())
                local_user.put()
            self.user = local_user.key().id()
            self.user_name = local_user.name
            self.logout_url = users.create_logout_url("/")
            return True
        else:
            self.response.write(template.render("login.html", {"login_url": users.create_login_url('/')}))
            return False
    def post(self):
        self.get()

class home(DefaultHandler):
    def get(self):
        if not self.auth():
          return
        args = {"user": self.user_name, "logout_url": self.logout_url}
        self.response.out.write(template.render("index.html", args))

class feeds(DefaultHandler):
    def get(self):
        if not self.auth():
          return
        r = models.Reading.all()
        r.filter('user = ', self.user)

        # there are two ways to do this

        # 1. use an integer unread counter - this has had major concurrency issues
        #    - perhaps sharding the counter would help
        #self.response.out.write(json.dumps({"feeds":[dict(models.Feed.get_by_id(a.feed).json().items() + {"unread":a.unread}.items()) for a in r]}))

        # 2. just count the unread articles
        #    - this is slower and uses [count] small datastore operations
        self.response.out.write(json.dumps({"feeds":[dict(models.Feed.get_by_id(a.feed).json().items() + {"unread":models.Unread.all().filter('user = ', self.user).filter('feed = ', a.feed).count()}.items()) for a in r]}))

class reading_list(DefaultHandler):
    def get(self):
        FETCH_LIMIT = 10
        if not self.auth():
          return
        unread = models.Unread.all()
        feed = self.request.get('feed')
        last = self.request.get('last')
        last = int(last) if last != None and last != "" else None
        unread.filter('user', self.user)
        if feed != 'all':
          unread.filter('feed', int(feed))
        unread.order('date')
        articles = [u.article for u in unread.fetch(FETCH_LIMIT)] # <= 10 read ops

        # get offset based on last article already sent
        if last in articles:
            pos = articles.index(last)
            articles = articles[pos+1:] + [u.article for u in unread.fetch(pos+1, offset = FETCH_LIMIT)] # <= 10 read ops

        self.response.out.write(json.dumps({"articles":articles}))

# DEPRECATED
# feeds() now returns this information
class unread(DefaultHandler):
    def get(self):
        if not self.auth():
          return
        unread = models.Unread.all()
        unread.filter('user = ', self.user)
        counts = {}
        for u in unread:
            a = models.Article.get_by_id(u.article)
            counts[a.feed] = counts.get(a.feed, 0) + 1
        self.response.out.write(json.dumps({"counts":counts}))

class article(DefaultHandler):
    def get(self):
        if not self.auth():
          return
        a = models.Article.get_by_id(int(self.request.get('article')))
        self.response.out.write(json.dumps({"article":a.json()}))

class read(DefaultHandler):
  def get(self):
    if not self.auth():
      return
    a = int(self.request.get('article'))
    ur = models.Unread.get_by_properties({"user": self.user, "article": a}) # 1 read op
    if ur != None:
      ur.delete() # 1 write op

      article = models.Article.get_by_id(a) # 1 read op
      reading = models.Reading.get_by_properties({"feed": article.feed, "user": self.user}) # 1 read op
      # decrement the unread count, try up to 10 times (concurrency issues)
      for i in xrange(10):
        try:
          decrement_unread(reading.key())
        except Exception as e:
          pass # there are rare cases where an exception may be raised by the transaction completed, let's ignore those
        else:
          break
    self.response.out.write("Success")

# this will be "atomic" but may not avoid concurrency issues
@db.transactional
def decrement_unread(r_key):
  reading = models.Reading.get(r_key)
  reading.unread -= 1
  reading.put() # 1 write op

# if the feed already exists and/or the user is already reading it, this
# returns the feed object as though nothing unusual happened
class add(DefaultHandler):
    def get(self):
        if not self.auth():
          return
        feed_url = self.request.get('feed')
        feed = models.Feed.get_by_properties({"url": feed_url})
        if feed == None:
            result = urlfetch.fetch(feed_url)
            if result.status_code != 200:
                raise Exception("Failed to fetch feed URL: " + feed.url)
            # some elements may have a namespace prefix like {http://www.w3.org/2005/Atom}
            try:
              root = ElementTree.fromstring(result.content)
            except Exception as err:
              raise Exception("Error: unable to parse feed '%s' (%s)" % (feed.url, str(err)))
            if root.tag == "rss":
              channel = root.find("channel")
              feed = models.Feed(url = feed_url,
                  title = channel.find("title").text,
                  description = channel.find("description").text,
                  language = (channel.find("language").text if channel.find("language") is not None else None), # not required
                  link = channel.find("link").text)
            else:
              namespace = '{http://www.w3.org/2005/Atom}'
              if root.tag == namespace+"feed":
                atom = root
                feed = models.Feed(url = feed_url,
                    title = atom.find(namespace+"title").text,
                    link = atom.find(namespace+"link").get("href"))
            # check again to make sure we don't already have this feed
            matching_feed = models.Feed.get_by_properties({"link": feed.link})
            if matching_feed == None:
              feed.put()
            else:
              feed = matching_feed
        already_reading = models.Reading.get_by_properties({"user": self.user, "feed": feed.key().id()})
        if not already_reading:
          r = models.Reading(user = self.user, feed = feed.key().id(), unread = 0)
          r.put()
        self.response.out.write(json.dumps(feed.json()))

class remove(DefaultHandler):
    def get(self):
        if not self.auth():
          return
        f = int(self.request.get("feed"))
        r = models.Reading.get_by_properties({"user": self.user, "feed": f})
        if r != None:
            r.delete()
            # remove unread articles for the removed feed
            for u in models.Unread.all().filter("feed", f).filter("user", self.user): # n read ops
              u.delete() # n*2 (?) write ops
            self.response.out.write("Success")
        else:
            self.response.out.write("Error: No such feed")

class new_user(DefaultHandler):
    def get(self):
        if not self.auth():
          return
        name = self.request.get('name')
        u = models.User.get_by_properties({"name": name})
        if u != None:
            u = models.User(name = name)
            u.put()
            self.response.out.write("Success")
        else:
            self.response.out.write("Taken")

class star(DefaultHandler):
    def get(self):
        if not self.auth():
          return
        a = int(self.request.get('article'))
        if models.Star.get_by_properties({"user": self.user, "article": a}) == None:
            s = models.Star(user = self.user, article = a)
            s.put()
        self.response.out.write("Success")

class unstar(DefaultHandler):
    def get(self):
        if not self.auth():
          return
        a = int(self.request.get('article'))
        s = models.Star.get_by_properties({"user": self.user, "article": a})
        if s != None:
            s.delete()
        self.response.out.write("Success")

class starred(DefaultHandler):
    def get(self):
        if not self.auth():
          return
        stars = models.Star.all()
        stars.filter("user", self.user)
        articles = sorted([models.Article.get_by_id(s.article) for s in stars], key = lambda a: a.date)
        articles = [a.key().id() for a in articles] # filter by feed
        self.response.out.write(json.dumps({"articles":articles}))

class manage_feeds(DefaultHandler):
    def get(self):
        if not self.auth():
          return
        args = {"user": self.user_name, "logout_url": self.logout_url}
        self.response.out.write(template.render("feeds.html", args))

class console(DefaultHandler):
    def get(self):
        if not self.auth():
          return
        args = {"user": self.user_name, "logout_url": self.logout_url}
        self.response.out.write(template.render("console.html", args))

app = webapp2.WSGIApplication([
    ("/", home),
    ("/feeds", feeds),
    ("/list", reading_list),
    ("/article", article),
    ("/read", read),
    ("/add", add),
    ("/remove", remove),
    ("/unread", unread),
    ("/star", star),
    ("/unstar", unstar),
    ("/starred", starred),
    ("/new_user", new_user),
    ("/manage_feeds", manage_feeds),
    ("/console", console)
], debug = True)

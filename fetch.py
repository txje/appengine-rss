#!/usr/bin/env python

import webapp2
import models
from datetime import datetime, timedelta
from google.appengine.api import urlfetch
from xml.etree import ElementTree # XML parsing
from google.appengine.ext import db

nsmap = {
    "xmlns": "http://purl.org/rss/1.0/",
    "xmlns:admin": "http://webns.net/mvcb/",
    "xmlns:rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "xmlns:prism": "http://purl.org/rss/1.0/modules/prism/",
    "xmlns:taxo": "http://purl.org/rss/1.0/modules/taxonomy/",
    "xmlns:content": "http://purl.org/rss/1.0/modules/content/",
    "xmlns:dc": "http://purl.org/dc/elements/1.1/",
    "xmlns:syn": "http://purl.org/rss/1.0/modules/syndication/"
    }

class updater(webapp2.RequestHandler):
    def get(self):
        active_feeds = {}
        for feed in models.Feed.all():
            readings = [r for r in models.Reading.all().filter('feed', feed.key().id())] # n read ops
            if len(readings) == 0:
              continue # no one is reading this feed
            try:
              result = urlfetch.fetch(feed.url)
            except Exception as e:
              print "Failed to fetch URL %s\n" % feed.url, e
              continue
            if result.status_code != 200:
              print "Failed to fetch feed URL: " + feed.url + ", result = " + str(result.status_code)
              continue
            try:
              root = ElementTree.fromstring(result.content)
            except Exception as err:
              print "Error: unable to parse feed '%s' (%s)" % (feed.url, str(err))
              continue
            atom_ns = '{http://www.w3.org/2005/Atom}'
            if root.tag == "rss":
                new_articles = self.parse_rss(root)
            elif root.tag == atom_ns+"feed":
                new_articles = self.parse_atom(root, atom_ns)
            elif root.tag == "{%s}RDF" % nsmap["xmlns:rdf"]: # Atom 1.0 as RDF
                new_articles = self.parse_rdf(root)
            else:
                print "Error: unknown feed '%s' format (must be RSS or Atom)" % feed.url
                continue

            unread_count = 0
            for article in new_articles:
                match = models.Article.get_by_properties({"url":article["url"]}) # 1 read op
                if match: # update contents
                  match.title = article["title"]
                  match.content = article["content"]
                  match.put()
                else:
                  unread_count += 1
                  #print "Title: --%s--, URL: --%s--, Content: --%s--" % (article["title"], article["url"], article["content"].encode("utf8", "ignore"))
                  a = models.Article(title = article["title"].strip(), url = article["url"], content = article["content"], date = article["date"], feed = feed.key().id())
                  a.put() # 1 write op
                  for r in readings:
                      u = models.Unread(user = r.user, article = a.key().id(), feed = r.feed, date = article["date"])
                      u.put() # 1 write op

            # fetch them again here so that the turnaround is as fast as possible, avoid concurrency issues
            for r in readings:
              # increase the unread count, try up to 10 times (concurrency issues)
              for i in xrange(10):
                try:
                  increase_unread(r.key().id(), unread_count)
                except Exception as e:
                  pass # there are rare cases where an exception may be raised by the transaction completed, let's ignore those
                else:
                  break

    def post(self):
        self.get()

    def parse_rss(self, root):
      new_articles = []
      for article in root.find("channel").findall("item"):
          title = (article.find("title").text.strip().replace('\n', ' -- ') if article.find("title") is not None else "No title!?")
          url = (article.find("link").text.strip() if article.find("link") is not None else None)
          content = (article.find("description").text.strip() if article.find("description") is not None else "No description!?")

          # parse pubDate
          # date is given as "Mon, 12 Aug 2013 01:00:00 GMT" or "-0000" instead of "GMT"
          pubDate = article.find("pubDate")
          if pubDate != None:
            pubDate = pubDate.text
            try:
              date = datetime.strptime(pubDate, "%a, %d %b %Y %H:%M:%S %Z")
            except Exception as e:
              try:
                offset = int(pubDate[-5:])
                date = datetime.strptime(pubDate[:-6], "%a, %d %b %Y %H:%M:%S")
                delta = timedelta(hours = offset / 100)
                date -= delta
              except Exception as e:
                try:
                  date = datetime.strptime(pubDate[:16], "%a, %d %b %Y")
                except Exception as e:
                  date = datetime.now()
          else:
            date = datetime.now()
          new_articles.append({"title":title, "url":url, "content":content, "date":date})
      return new_articles

    def parse_atom(self, root, namespace):
      new_articles = []
      for article in root.findall(namespace+"entry"):
          title = article.find(namespace+"title").text
          if title is None:
              title = ""
          else:
              title = title.strip().replace('\n', ' -- ')
          url = article.find(namespace+"link").get("href")
          if url is None:
              url = ""
          else:
              url = url.strip()
          content = article.find(namespace+"content").text.strip() if article.find(namespace+"content") is not None else article.find(namespace+"summary").text.strip()

          # parse pubDate (<updated>)
          # date is given as "2013-08-12T01:00:00Z" or "-01:00" instead of "Z" and may optionally have two decimals of extra precision in the seconds place
          pubDate = article.find(namespace+"updated")
          if pubDate != None:
            pubDate = pubDate.text
            try:
              # so I'm not trying very hard here, just ignoring the timezone
              date = datetime.strptime(pubDate[:19], "%Y-%m-%dT%H:%M:%S")
            except Exception as e:
              try:
                date = datetime.strptime(pubDate[:10], "%Y-%m-%d")
              except Exception as e:
                date = datetime.now()
          else:
            date = datetime.now()
          new_articles.append({"title":title, "url":url, "content":content, "date":date})
      return new_articles

    def parse_rdf(self, root):
      new_articles = []
      for article in root.findall("xmlns:item", nsmap):
          title = article.find("xmlns:title", nsmap).text.strip().replace('\n', ' -- ')
          #print "Title: --%s--" % title
          url = article.find("xmlns:link", nsmap).text.strip().strip('"')
          #print "URL: --%s--" % url
          content = article.find("xmlns:description", nsmap).text.strip()
          #print "Content: --%s--" % content

          # parse pubDate (<updated>)
          # date is given as "2013-08-12T01:00:00Z" or "-01:00" instead of "Z" and may optionally have two decimals of extra precision in the seconds place
          pubDate = article.find("xmlns:dc:date", nsmap)
          if pubDate != None:
            pubDate = pubDate.text
            #print "Date: --%s--" % pubDate
            try:
              # so I'm not trying very hard here, just ignoring the timezone
              date = datetime.strptime(pubDate[:19], "%Y-%m-%dT%H:%M:%S")
            except Exception as e:
              try:
                date = datetime.strptime(pubDate[:10], "%Y-%m-%d")
              except Exception as e:
                date = datetime.now()
          else:
            date = datetime.now()
          new_articles.append({"title":title, "url":url, "content":content, "date":date})
      return new_articles

@db.transactional
def increase_unread(reading_id, amount):
  r = models.Reading.get_by_id(reading_id)
  r.unread += amount
  r.put() # 1 write op

app = webapp2.WSGIApplication([
    ("/tasks/fetch", updater)
])

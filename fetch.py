#!/usr/bin/env python

import models
import datetime
from google.appengine.api import urlfetch
from xml.etree import ElementTree # XML parsing

def update_feeds():
    active_feeds = {}
    for r in models.Reading.all():
        if not active_feeds.has_key(r.feed):
            active_feeds[r.feed] = []
        active_feeds[r.feed].append(r.user)
    for fid in active_feeds.keys():
        feed = models.Feed.get_by_id(fid)
        result = urlfetch.fetch(feed.url)
        if result.status_code != 200:
            raise Exception("Failed to fetch feed URL: " + feed.url)
        rss = ElementTree.fromstring(result.content)
        new_articles = []
        for article in rss.find("channel").findall("item"):
            title = article.find("title").text
            url = article.find("link").text
            content = article.find("description").text
            date = article.find("pubDate").text if article.find("pubDate") else datetime.datetime.now()
            matches = models.Article.all()
            matches.filter('title = ', title)
            matches.filter('url = ', url)
            if not matches.get():
                a = models.Article(title = title, url = url, content = content, date = date, feed = feed.key().id())
                a.put()
                for user in active_feeds[fid]:
                    u = models.Unread(user = user, article = a.key().id())
                    u.put()

if __name__ == "__main__":
    update_feeds()

// Commands:
//
// get unread count
// star article
// open article
// next article (automatically marks as read)

$(document).ready(function() {
    this.Article = function(id, starred) {
        var $elem = null;
        this.id = id;
        var feed_id = null;
        var done_reading = (starred == true);

        this.load = function($e) {
            $elem = $e;
            $.getJSON("article?article=" + id, function(data) {
                // title, url, content, date
                var article = data["article"];
                feed_id = article["feed"];
                var title = $("<a>");
                title.text(article.title);
                title.attr('href', article.url);
                title.attr("target", "_blank");
                title.addClass("article_title");
                var content = $("<div>");
                content.text(article.content);
                content.addClass("article_content");
                $elem.append(title);
                $elem.append(content);
            }.bind(this));
        }

        this.read = function() {
            $.get("read?article=" + id);
        }
    }

    this.ConsoleReader = function($container) {
        var viewing_index = 0;
        var loaded_articles = [];
        var selected_feed = 'All';
        var loading = false;
        var unread = 0;
        
        this.print = function(str) {
            var entry = $('<div>');
            entry.text(str);
            $container.append(entry);
        }

        function get_unread_counts() {
            $.getJSON("feeds", function(data) {
                var feeds = data["feeds"];
                for(var f = 0; f < feeds.length; f++) {
                    unread += feeds[f].unread;
                }
            });
        }

        // feed: feed ID or 'all'
        function get_unread(feed) {
            selected_feed = feed;
            $.getJSON("list?feed=" + feed, function(data) {  // get user's unread reading list
                display_articles(data, true);
            });
        }

        function get_starred() {
            $.getJSON("starred", function(data) {
                selected_feed = 'Starred';
                display_articles(data, true, true);
            });
        }

        function clear() {
            $("html, body").scrollTop(0);
            content.empty();
            loaded_articles = [];
        }

        function display_articles(data, clear, starred) {
            var articles = data['articles'];
            
            for(var a = 0; a < articles.length; a++) {
                var article = new Article(articles[a], starred);
                loaded_articles.push(article);
            }
        }

        function load_more_articles(last_loaded) {
            if(loading) return;
            loading = true;
            if(selected_feed == 'Starred') {
              // not paging starred as of now
            } else {
                $.getJSON("list?feed=" + selected_feed + "&last=" + last_loaded, function(data) {  // get user's unread reading list
                    display_articles(data, false);
                    loading = false;
                });
            }
        }

        // init
        $.getJSON("feeds", function(data) { // get user's feed
            var feeds = data["feeds"];
            process_feeds(feeds);
            update_unread(feeds);
        });
        
        function process(command) {
            console.log("Command: " + command);
        }

        $(".cursor").keydown(function(event) {
            var key = event.keyCode;
            if(key == 32) { // Enter
                var $source = $(event.source);
                process($source.text());
                $source.text("");
            }
        }.bind(this));
    }
}.bind(window));

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
        
        function strip(html) {
           var tmp = $("<div>");
           tmp.html(html);
           return tmp.text();
        }

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
                content.text(strip(article.content));
                content.addClass("article_content");
                $elem.append(title);
                $elem.append(content);
                $elem.append($("<div>").append("&nbsp;"));
                $("html, body").scrollTop($(document).height());
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
            if(str.length == 0) {
                entry.html("&nbsp;");
            }
            entry.addClass("entry");
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
                load_articles(data, true);
            });
        }

        function get_starred() {
            $.getJSON("starred", function(data) {
                selected_feed = 'Starred';
                load_articles(data, true, true);
            });
        }

        function clear() {
            $("html, body").scrollTop(0);
            $container.empty();
            loaded_articles = loaded_articles.slice(viewing_index, loaded_articles.length);
            console.log(loaded_articles);
            viewing_index = 0;
        }

        function load_articles(data, clear, starred) {
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
                    load_articles(data, false);
                    loading = false;
                });
            }
        }

        // init
        $.getJSON("feeds", function(data) { // get user's feed
            var feeds = data["feeds"];
            for(var f = 0; f < feeds.length; f++) {
                this.print("[" + feeds[f]["unread"] + "] " + feeds[f]["title"])
            }
            this.print("");
            get_unread('all');
        }.bind(this));
        
        function process(command) {
            if(command == "") {
                if(viewing_index >= loaded_articles.length) {
                    this.print("No more articles.");
                    this.print("");
                    return;
                }
                loaded_articles[viewing_index].load($container);
                loaded_articles[viewing_index].read();
                viewing_index += 1;
                if(viewing_index >= loaded_articles.length - 2) {
                    load_more_articles(loaded_articles[loaded_articles.length - 1].id)
                }
            } else if(command == "clear") {
                clear();
            }
        };

        this.register = function($input) {
            $('body').keydown(function(event) {
                $("html, body").scrollTop($(document).height());
                var key = event.keyCode;
                if(key == 13) { // Enter
                    process.apply(this, [$input.text()]);
                    $input.text("");
                } else if(key >= 48 && key <= 90) { // a-z 0-9
                    var chr = String.fromCharCode(event.keyCode).toLowerCase();
                    $input.text($input.text() + chr);
                } else if(key == 8) { // backspace
                    var text = $input.text();
                    $input.text(text.slice(0, text.length-1));
                }
                event.preventDefault();
            }.bind(this));
        }
    }
}.bind(window));

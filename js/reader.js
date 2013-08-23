$(document).ready(function() {
    this.Article = function(id, user) {
        var $elem = null;
        this.id = id;

        this.load = function($e) {
            $elem = $e;
            $.getJSON("article?article=" + id, function(data) {
                console.log("article " + id + ":", data);
                // title, url, content, date
                var article = data["article"];
                var title = $("<a>");
                title.text(article.title);
                title.attr('href', article.url);
                title.attr("target", "_blank");
                title.addClass("article_title");
                var controls = $("<span>");
                controls.addClass("article_controls");
                var star_btn = $("<a>");
                controls.append(star_btn);
                star_btn.addClass("glyphicon");
                star_btn.addClass("icon-link");
                star_btn.css("font-size", "2em");
                star_btn.addClass("glyphicon-star-empty");
                star_btn.click(function() {
                    $.get("star?u=" + user + "&article=" + id, function(data) {
                        var $btn = $(this);
                        $btn.removeClass("glyphicon-star-empty");
                        $btn.addClass("glyphicon-star");
                    }.bind(this));
                });
                var content = $("<div>");
                content.html(article.content);
                content.addClass("article_content");
                $elem.append(title);
                $elem.append(controls);
                $elem.append($("<hr>"));
                $elem.append(content);
            });
            $elem.click(function() {
                this.read();
            }.bind(this));
        }

        this.unload = function() {
            $elem.html("");
        }

        this.read = function() {
            console.log("Marking article " + id + " read.");
            $.get("read?u=" + user + "&article=" + id, function(data) {
                if(data == "Success") {
                    $elem.css('border-color', '#DDDDDD');
                }
            })
        }

        this.above_screen = function() {
            return ($elem.offset().top < $(document).scrollTop());
        }
    }

    this.Reader = function(user) {
        var viewing_index = 0;
        var loaded_articles = [];

        this.starred = function() {
            $.getJSON("starred?u=" + user, function(data) {
                console.log(user + "'s starred:" , data);
            });
        }

        function process_feeds(feeds, unread) {
            var $all_feeds = $("<div>");
            $all_feeds.addClass('feed_link');
            $all_feeds.append("All ");
            var unread_span = $("<span>");
            unread_span.attr('id', "unread_All");
            var unread_total = 0;
            for(feed in unread)
                unread_total += unread[feed];
            unread_span.text("(" + unread_total + ")");
            $all_feeds.append(unread_span);
            $all_feeds.click(function() {
              get_unread('all');
            });
            $("#control").append($all_feeds);
            for(var f = 0; f < feeds.length; f++) {
                var feed = feeds[f];
                console.log('  ', feed);
                var feed_link = $("<div>");
                feed_link.addClass('feed_link');
                feed_link.append(feed["title"] + " ");
                var unread_span = $("<span>");
                unread_span.attr('id', "unread_" + feed["title"]);
                if(feed["title"] in unread) {
                  unread_span.text("(" + unread[feed["title"]] + ")");
                } else {
                  unread_span.text("(0)");
                }
                feed_link.append(unread_span);
                feed_link.click(function(feed) {
                    get_unread(feed["id"]);
                }.bind(this, feed));
                $("#control").append(feed_link);
            }
        }

        function get_unread(feed) {
            $.getJSON("list?u=" + user + "&feed=" + feed, function(data) {  // get user's unread reading list
                console.log(user + "'s reading list:", data);
                var articles = data['articles'];
                var content = $('#content');
                content.empty();

                // reset viewing queue
                loaded_articles = [];
                viewing_index = 0;

                for(var a = 0; a < articles.length; a++) {
                    var article = new Article(articles[a], user);
                    loaded_articles.push(article);
                    var article_box = $("<div>");
                    article_box.addClass("article_box");
                    content.append(article_box);
                    article.load(article_box);
                }
            });
        }

        // auto-read articles as the pass out of the screen
        $(document).scroll(function() {
            var len = loaded_articles.length;
            for(var i = viewing_index; i < len; i++) {
                if(loaded_articles[i].above_screen()) {
                    loaded_articles[i].read();
                } else {
                    break;
                }
            }
            viewing_index = i;
        }.bind(this));

        // init
        $.getJSON("feeds?u=" + user, function(data) { // get user's feed
            var feeds = data["feeds"];
            console.log(user + "'s feeds:", feeds);
            $.getJSON("unread?u=" + user, function(data) {
                console.log("unread:", data);
                unread = data["counts"];
                process_feeds(feeds, unread);
            });
        });
    }
}.bind(window));

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
                var controls = $("<span>");
                controls.addClass("article_controls");
                var star_btn = $("<a>");
                controls.append(star_btn);
                star_btn.addClass("glyphicon");
                star_btn.addClass("icon-link");
                star_btn.css("font-size", "2em");
                if(starred) {
                    star_btn.addClass("glyphicon-star");
                } else {
                    star_btn.addClass("glyphicon-star-empty");
                }
                star_btn.click(function() {
                    var $btn = $(this);
                    if($btn.hasClass("glyphicon-star-empty")) {
                      $.get("star?article=" + id, function(data) {
                          $btn.removeClass("glyphicon-star-empty");
                          $btn.addClass("glyphicon-star");
                      }.bind(this));
                    } else if($btn.hasClass("glyphicon-star")) {
                      $.get("unstar?article=" + id, function(data) {
                          $btn.removeClass("glyphicon-star");
                          $btn.addClass("glyphicon-star-empty");
                      }.bind(this));
                    }
                });
                var content = $("<div>");
                content.html(article.content);
                content.addClass("article_content");
                $elem.append(title);
                $elem.append(controls);
                $elem.append($("<hr>"));
                $elem.append(content);
            }.bind(this));
            $elem.click(function() {
                this.read();
            }.bind(this));
        }

        this.unload = function() {
            $elem.html("");
        }

        this.read = function() {
            if(done_reading) return;
            done_reading = true;

            $.get("read?article=" + id, function(data) {
                if(data == "Success") {
                    $elem.css('border-color', '#DDDDDD');
                    var unreads = $("#unread_" + feed_id);
                    var count = parseInt(unreads.text().substring(1, unreads.text().length-1));
                    unreads.text("(" + (count-1) + ")");
                    var all = $("#unread_All");
                    count = parseInt(all.text().substring(1, all.text().length-1));
                    all.text("(" + (count-1) + ")");
                    if(count > 1) {
                      $(document).attr('title', 'Feeeeeder (' + (count-1) + ')');
                    } else {
                      $(document).attr('title', 'Feeeeeder');
                    }
                }
            }.bind(this))
        }

        this.above_screen = function() {
            return ($elem.offset().top < $(document).scrollTop());
        }

        this.on_screen = function() {
            return ($elem.offset().top - $(document).scrollTop() < $(window).height());
        }
    }

    this.Reader = function() {
        var viewing_index = 0;
        var loaded_articles = [];
        var selected_feed = 'All';
        var loading = false;

        function update_unread(feeds) {
            var unread_total = 0;
            for(var f = 0; f < feeds.length; f++) {
                var feed = feeds[f];
                unread_total += feed.unread;
                $('#unread_' + feed.id).text("(" + feed.unread + ")");
            }
            $('#unread_All').text("(" + unread_total + ")");
            if(unread_total > 0) {
              $(document).attr('title', 'Feeeeeder (' + unread_total + ')');
            } else {
              $(document).attr('title', 'Feeeeeder');
            }
        }

        function process_feeds(feeds) {
            var $all_feeds = $("<div>");
            $all_feeds.addClass('feed_link');
            $all_feeds.append("All ");
            var unread_span = $("<span>");
            unread_span.attr('id', "unread_All");
            unread_span.text("(0)");

            $all_feeds.append(unread_span);
            $all_feeds.click(function() {
              get_unread('all');
            });
            get_unread('all'); // load all unread articles by default
            $("#control").append($all_feeds);
            $("#control").append("<br/>");
            for(var f = 0; f < feeds.length; f++) {
                var feed = feeds[f];
                var feed_link = $("<div>");
                feed_link.addClass('feed_link');
                feed_link.append(feed["title"] + " ");
                var unread_span = $("<span>");
                unread_span.attr('id', "unread_" + feed["id"]);
                unread_span.text('(0)');

                feed_link.append(unread_span);
                feed_link.click(function(feed) {
                    get_unread(feed["id"]);
                }.bind(this, feed));
                $("#control").append(feed_link);
            }
            $("#control").append("<br/>");
            var $starred = $("<div>");
            $starred.addClass('feed_link');
            $starred.append("Starred");
            $starred.click(function() {
              get_starred();
            });
            $("#control").append($starred);
        }

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

        function display_articles(data, clear, starred) {
            if(clear == null) clear = false;
            if(starred == null) starred = false;
            var articles = data['articles'];
            var content = $('#content');

            if(clear) {
                $("html, body").scrollTop(0);
                content.empty();
                loaded_articles = [];
                viewing_index = 0;
            }

            for(var a = 0; a < articles.length; a++) {
                var article = new Article(articles[a], starred);
                loaded_articles.push(article);
                var article_box = $("<div>");
                article_box.addClass("article_box");
                content.append(article_box);
                article.load(article_box);
            }
        }

        // auto-read articles as the pass out of the screen
        $(document).scroll(function() {
            var len = loaded_articles.length;
            for(var i = viewing_index; i < len; i++) {
                if(loaded_articles[i].above_screen()) {
                    loaded_articles[i].read();
                    viewing_index = i + 1;
                }
                else if(loaded_articles[i].on_screen()) {
                    if(i >= len-2) { // on the second-to-last article
                        load_more_articles(loaded_articles[len-1].id) // load more
                    }
                }
                else {
                    break;
                }
            }
        }.bind(this));

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

        function get_unread_counts() {
          $.getJSON("feeds", function(data) {
              var feeds = data["feeds"];
              update_unread(feeds);
          });
        }

        // init
        $.getJSON("feeds", function(data) { // get user's feed
            var feeds = data["feeds"];
            process_feeds(feeds);
            update_unread(feeds);
        });

        setInterval(get_unread_counts, 300000); // refresh unread counts every 5 minutes
    }
}.bind(window));

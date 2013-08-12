$(document).ready(function() {
    function Reader(user) {
        this.starred = function() {
            $.getJSON("starred?u=" + user, function(data) {
                console.log(user + "'s starred:" , data);
            });
        }

        function process_feeds(feeds) {
            var $all_feeds = $("<div>");
            $all_feeds.addClass('feed_link');
            $all_feeds.append("All");
            $all_feeds.click(function() {
              get_unread('all');
            });
            $("#control").append($all_feeds);
            for(var f = 0; f < feeds.length; f++) {
              var feed = feeds[f];
              console.log('  ', feed);
              var feed_link = $("<div>");
              feed_link.addClass('feed_link');
              feed_link.append(feed["title"]);
              feed_link.click(function(feed) {
                get_unread(feed["id"]);
              }.bind(this, feed));
              $("#control").append(feed_link);
            }
        }

        function get_unread(feed) {
            $.getJSON("list?u=" + user + "&feed=" + feed, function(data) {  // get user's unread reading list
                console.log(user + "'s reading list:", data);
                load_articles(data['articles']);
            });
        }
        
        // init
        $.getJSON("feeds?u=" + user, function(data) { // get user's feed
            var feeds = data["feeds"];
            console.log(user + "'s feeds:", feeds);
            process_feeds(feeds);
        });
    }
    
    var reader = new Reader("jeremy");
});

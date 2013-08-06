$(document).ready(function() {
    function Reader(user) {
        this.starred = function() {
            $.getJSON("starred?u=" + user, function(data) {
                console.log(user + "'s starred:" , data);
            });
        }
        
        // init
        $.getJSON("feeds?u=" + user, function(data) { // get user's feed
            var feeds = data["feeds"];
            console.log(user + "'s feeds:", feeds);
            var $all_feeds = $("<div>");
            $all_feeds.addClass('feed_link');
            $all_feeds.append("All");
            $("#control").append($all_feeds);
            for(var f = 0; f < feeds.length; f++) {
              var feed = feeds[f];
              console.log('  ', feed);
              var feed_link = $("<div>");
              feed_link.addClass('feed_link');
              feed_link.append(feed["title"]);
              $("#control").append(feed_link);
            }
            $.getJSON("list?u=" + user, function(data) {  // get user's unread reading list
                console.log(user + "'s reading list:", data);
            });
        });
    }
    
    var reader = new Reader("jeremy");
});

$(document).ready(function() {
    function Reader(user) {
        this.starred = function() {
            $.getJSON("starred?u=" + user, function(data) {
                console.log(user + "'s starred:" , data);
            });
        }
        
        // init
        $.getJSON("feeds?u=" + user, function(data) { // get user's feed
            console.log(user + "'s feeds:", data);
            $.getJSON("list?u=" + user, function(data) {  // get user's unread reading list
                console.log(user + "'s reading list:", data);
            });
        });
    }
    
    var reader = new Reader("jeremy");
});
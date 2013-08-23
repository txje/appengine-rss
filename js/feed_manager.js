$(document).ready(function() {
    this.Feed = function(data) {
        this.id = data["id"];
        var title = data["title"];
        var description = data["description"];
        var url = data["url"];
        var language = data["language"];
        var link = data["link"];

        this.elem = $("<div>");

        var remove_btn = $("<a>");
        remove_btn.attr("data-toggle", "modal");
        remove_btn.attr("href", "#remove_feed_modal");
        remove_btn.click(function() {
          $("#feed_to_remove").text(title);
          $("#feed_id_to_remove").val(this.id);
        }.bind(this));
        remove_btn.addClass("glyphicon");
        remove_btn.addClass("glyphicon-remove");
        remove_btn.addClass("icon-link");
        this.elem.append(remove_btn);

        this.elem.append("<span class='spacer-10'>");

        var a = $("<a>");
        a.attr("href", link);
        a.attr("target", "_blank");
        a.append(title);
        a.css("cursor", "pointer");
        this.elem.append(a);

        var desc = $("<span>");
        desc.css("text-decoration", "italics");
        if(description) {
          desc.append(" - " + description);
        }
        this.elem.append(desc);
    }

    this.FeedManager = function(user) {
        var feeds = [];
        var feed_box = $("<div>");
        $("#content").append(feed_box);

        this.new_feed = function(url) {
            var posting = $.post("add", {"u": user, "feed": url}); // POST will return parsed JSON data
            posting.done(function(data, textStatus) {
                data = JSON.parse(data);
                if(textStatus == "success") {
                  if(data.error == null) {
                    // clear the URL
                    $("#feed_url").val("");
                    // check if feed already exists
                    for(var f = 0; f < feeds.length; f++) {
                      if(feeds[f].id == data.id) {
                        $("#add_feed_error").text("You are already subscribed to \"" + data.title + "\".");
                        $("#add_feed_error_box").show();
                        return;
                      }
                    }
                    // add the feed
                    var feed = new Feed(data);
                    feeds.push(feed);
                    feed_box.append(feed.elem);
                    $("#add_feed_error_box").hide();
                  } else {
                    var error_text = data.error;
                    $("#add_feed_error").text(error_text);
                    $("#add_feed_error_box").show();
                  }
                }
                else {
                  var error_text = "Unable to add feed, re-check the URL.";
                  $("#add_feed_error").text(error_text);
                  $("#add_feed_error_box").show();
                }
            }.bind(this));
        }

        $.getJSON("feeds?u=" + user, function(data) {
            var feeds_data = data["feeds"];
            for(var f = 0; f < feeds_data.length; f++) {
                var feed = new Feed(feeds_data[f]);
                feeds.push(feed);
                feed_box.append(feed.elem);
            }
        });

        $("#confirm_remove_feed").click(function() {
          $.get("remove?u=" + user + "&feed=" + $("#feed_id_to_remove").val(), function(data, textStatus) {
            if(textStatus == "success") {
              // close the modal
              $("#remove_feed_modal").modal("hide");
              // remove the feed
              for(var f = 0; f < feeds.length; f++) {
                var feed = feeds[f];
                if(feed.id == parseInt($("#feed_id_to_remove").val())) {
                  feed.elem.remove();
                  feeds.splice(f, 1);
                  break;
                }
              }
            }
          }.bind(this));
        }.bind(this));

        $("#add_feed").click(function() {
          this.new_feed($("#feed_url").val());
          return false;
        }.bind(this));
    }
}.bind(window));

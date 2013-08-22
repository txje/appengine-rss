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
        a.append(title);
        a.css("cursor", "pointer");
        this.elem.append(a);

        var desc = $("<span>");
        desc.css("text-decoration", "italics");
        desc.append(" - " + description);
        this.elem.append(desc);
    }

    this.FeedManager = function(user) {
        var feeds = [];
        var feed_box = $("<div>");
        $("#content").append(feed_box);

        this.new_feed = function(url) {
            $.post("add", {"u": user, "feed": url}, function(data, textStatus) {
                if(textStatus == "success") {
                    var f = new Feed(JSON.parse(data));
                    feed_box.append(f.elem);
                } else {
                    error("Unable to add feed, check the URL");
                }
            });
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
          $.post("add?u=" + user + "&feed=" + $("#feed_url").val(), function(data, textStatus) {
            console.log(textStatus);
            if(textStatus == "success") {
              if(data.error == null) {
                // add the feed
                for(var f = 0; f < feeds.length; f++) {
                  $("#feed_url").text("");
                  var feed = new Feed(data);
                  feeds.push(feed);
                  feed_box.append(feed.elem);
                }
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
          }.bind(this), "json"); // POST return will be interpreted as JSON
          return false;
        }.bind(this));
    }
}.bind(window));

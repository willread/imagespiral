$(function(){
   	$("#upload-button").hide();
	$("#files-list-wrapper").hide();
   	$("#upload-button").click(function(){
		$("#upload-cover").removeClass("hidden");
   	});
	$("#files").change(function(){
		$("#upload-button").show();
		$("#files-list").html("");
		var input = $("#files")[0];
		if(input.files && input.files.length > 1){
			// Multiple upload supported
			// for(var ii = 0; ii < input.files.length; ii++){
			// 	files[input.files[ii].name] = input.files[ii];
			//	var li = $("<li>");
			//	li.append(input.files[ii].name);
				/*var button = $("<button>x</button>");
				button.click({file: input.files[ii].name}, function(e){
					delete(files[e.data.file]);
					$(this).parent().remove();
				});
				li.append(button);*/
			//	$("#files-list").append(li);
			// }
			$("#files-list-wrapper").show();
			$("#files-list").html(input.files.length + " files selected")
		}else{
			// Single upload only
			$("#files-list").html("1 file selected")
		}
	});
});
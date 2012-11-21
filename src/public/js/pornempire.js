$(function () {
	$("#file").change(function(e){
	   	$("#upload-button").show();
	});
   	$("#upload-button").hide();
   	$("#upload-button").click(function(){
		$("#upload-cover").removeClass("hidden");
   	});
});
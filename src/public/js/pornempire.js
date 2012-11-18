$(function () {
	$("#file").change(function(e){
		$("#upload-cover").removeClass("hidden");
    	document.getElementById("upload-form").submit();
	});
});
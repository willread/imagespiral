$(function () {
	$(".drop").droppable({
		hoverClass: "hover"
	});
    $('#file').fileupload({
        dataType: 'json',
        done: function (e, data) {
            $.each(data.result, function (index, file) {
                $('<p/>').text(file.name).appendTo(document.body);
            });
        },
        dropZone: $(".drop"),
        autoUpload: true
    });
    $('#file').bind('fileuploadadd', function(e, data) {
    	console.log(data);
		$("#upload-cover").removeClass("hidden");
    	var form = document.createElement("form");
    	form.method = "POST";
    	form.enctype = "multipart/form-data";
    	form.action = "/";
    	data.fileInput[0].name = "file";
    	form.appendChild(data.fileInput[0]);
    	
    	form.submit();
    })
    $(document).bind('drop dragover', function (e) {
    	e.preventDefault();
	});
});
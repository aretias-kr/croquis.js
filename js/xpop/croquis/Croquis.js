define(["xpop/croquis/tabletapi",
		"xpop/croquis/color/Color",
		"xpop/croquis/paintingtool/Tools"],
	function (tabletapi, Color, Tools) {
	var Croquis = function (width, height) {
		var domElement = document.createElement("div");
		domElement.style.clear = "both";
		/*
		배경이 투명하다는 것을 인식시키기 위한 체크무늬를 바닥에 붙인다.
		인터넷 익스플로러에서 zIndex가 0일 경우 제대로 작동하지 않으므로:
		http://brenelz.com/blog/squish-the-internet-explorer-z-index-bug/
		체크무늬의 zIndex를 1로 설정했다.
		*/
		var backgroundCheckers = document.createElement("div");
		(function () {
			var backgroundImage = document.createElement("canvas");
			backgroundImage.width = backgroundImage.height = 20;
			var backgroundImageContext = backgroundImage.getContext("2d");
			backgroundImageContext.fillStyle = "#FFFFFF";
			backgroundImageContext.fillRect(0, 0, 20, 20);
			backgroundImageContext.fillStyle = "#CCCCCC";
			backgroundImageContext.fillRect(0, 0, 10, 10);
			backgroundImageContext.fillRect(10, 10, 20, 20);
			backgroundCheckers.style.backgroundImage = "url(" + backgroundImage.toDataURL() + ")";
			backgroundCheckers.style.zIndex = 1;
			backgroundCheckers.style.position = "absolute";
		})();
		domElement.appendChild(backgroundCheckers);
		this.getDOMElement = function () {
			return domElement;
		}
		/*
		외부에서 임의로 내부 상태를 바꾸면 안되므로
		getCanvasSize는 읽기전용 값을 새로 만들어서 반환한다.
		*/
		var size = {width: width, height: height};
		this.getCanvasSize = function () {
			return {width: sizw.width, height: size.height};
		}
		this.setCanvasSize = function (width, height) {
			size.width = width = Math.floor(width);
			size.height = height = Math.floor(height);
			paintingLayer.width = width;
			paintingLayer.height = height;
			domElement.style.width = backgroundCheckers.style.width = width + "px";
			domElement.style.height = backgroundCheckers.style.height = height + "px";
			for(var i=0; i<layers.length; ++i)
			{
				switch(layers[i].tagName.toLowerCase())
				{
					case "canvas":
						var canvas = layers[i];
						var context = canvas.getContext("2d");
						var imageData = context.getImageData(0, 0, width, height);
						canvas.width = width;
						canvas.height = height;
						context.putImageData(imageData, 0, 0);
						break;
					default:
						continue;
				}
			}
		}
		this.getCanvasWidth = function () {
			return size.width;
		}
		this.setCanvasWidth = function (width) {
			setCanvasSize(width, size.height);
		}
		this.getCanvasHeight = function () {
			return size.height;
		}
		this.setCanvasHeight = function (height) {
			setCanvasSize(size.width, height);
		}
		var layers = [];
		var layerIndex = 0;
		/*
		포토샵 브러시의 opacity와 같은 효과를 주기 위해서
		화면에 그림을 그리는 툴들은 paintingLayer에 먼저 그림을 그린 다음
		마우스를 떼는 순간(up 함수가 호출되는 순간) 레이어 캔버스에 옮겨그린다.
		*/
		var paintingLayer = document.createElement("canvas");
		paintingLayer.style.zIndex = 3;
		paintingLayer.style.position = "absolute";
		domElement.appendChild(paintingLayer);
		var paintingContext = paintingLayer.getContext("2d");
		this.setCanvasSize(width, height);
		function layersZIndex() {
			/*
			paintingLayer가 들어갈 자리를 만들기 위해
			레이어의 zIndex는 2 간격으로 설정한다.
			zIndex 1은 체크무늬가 사용하고 있으므로 2부터 시작한다.
			*/
			for(var i=0; i<layers.length; ++i)
				layers[i].style.zIndex = i * 2 + 2;
		}
		this.getLayers = function () {
			return layers.concat();
		}
		this.addLayer = function (layerType) {
			var layer;
			layerType = layerType || "canvas";
			switch(layerType.toLowerCase())
			{
				case "canvas":
					layer = document.createElement("canvas");
					layer.style.visibility = "visible";
					layer.style.opacity = 1;
					layer.width = size.width;
					layer.height = size.height;
					break;
				default:
					throw "unknown layer type";
					return null;
			}
			layer.style.position = "absolute";
			domElement.appendChild(layer);
			layers.push(layer);
			if(layers.length == 1)
				this.selectLayer(0);
			layersZIndex();
			return layer;
		}
		this.addFilledLayer = function (fillColor) {
			var layer = this.addLayer("canvas");
			var context = layer.getContext("2d");
			context.fillStyle = fillColor.getHTMLColor();
			context.fillRect(0, 0, layer.width, layer.height);
			return layer;
		}
		this.removeLayer = function (index) {
			domElement.removeChild(layers[index]);
			layers.splice(index, 1);
			if(layerIndex == layers.length)
				this.selectLayer(--layerIndex);
			layersZIndex();
		}
		this.swapLayer = function (index1, index2) {
			var layer = layers[index1];
			layers[index1] = layers[index2];
			layers[index2] = layer;
			layersZIndex();
		}
		this.selectLayer = function (index) {
			if(tool.setContext)
				tool.setContext(null);
			layerIndex = index;
			/*
			paintingLayer는 현재 선택된 레이어의 바로 위에 보여야 하므로
			현재 선택된 레이어보다 zIndex를 1만큼 크게 설정한다.
			*/
			paintingLayer.style.zIndex = index * 2 + 3;
			switch(layers[index].tagName.toLowerCase())
			{
				case "canvas":
					if(tool.setContext)
						if(eraserTool)
						{
							tool.setContext(layers[index].getContext("2d"));
						}
						else
						{
							tool.setContext(paintingContext);
						}
					break;
				default:
					break;
			}
		}
		this.setLayerOpacity = function (opacity) {
			layers[layerIndex].style.opacity = opacity;
		}
		this.setLayerVisible = function (visible) {
			layers[layerIndex].style.visibility = visible ? "visible" : "hidden";
		}
		var tools = new Tools;
		var tool = tools.getBrush();
		/*
		화면에 내용이 없는 paintingLayer에 지우개질을 하면 의미가 없으므로
		지우개 툴일 경우에는 레이어의 context를 툴에 바로 적용한다.
		*/
		var eraserTool = false;
		var toolSize = 10;
		var toolColor = new Color;
		var toolOpacity = 1;
		this.setTool = function (toolName) {
			switch(toolName.toLowerCase())
			{
				case "brush":
					tool = tools.getBrush();
					eraserTool = false;
					break;
				case "eraser":
					tool = tools.getEraser();
					eraserTool = true;
					break;
				default:
					break;
			}
			this.setToolSize(toolSize);
			this.setToolColor(toolColor);
			this.selectLayer(layerIndex);
		}
		this.getToolSize = function () {
			return toolSize;
		}
		this.setToolSize = function (size) {
			toolSize = size;
			if(tool.setSize)
				tool.setSize(toolSize);
		}
		this.getToolColor = function () {
			return toolColor;
		}
		this.setToolColor = function (color) {
			toolColor = color;
			if(tool.setColor)
				tool.setColor(toolColor);
		}
		this.getToolOpacity = function () {
			return toolOpacity;
		}
		this.setToolOpacity = function (opacity) {
			toolOpacity = opacity;
		}
		/*
		보이는 모든 레이어를 하나로 합친 이미지 데이터를 반환한다.
		png 파일로 뽑아보기 위해 임시로 만들어졌다.
		*/
		this.getMergedImageData = function () {
			var mergedImage = document.createElement("canvas");
			mergedImage.width = size.width;
			mergedImage.height = size.height;
			var context = mergedImage.getContext("2d");
			for(var i=0; i<layers.length; ++i)
			{
				var layer = layers[i];
				if(layer.style.visible != "hidden")
				{
					context.globalAlpha = layer.style.opacity;
					switch(layer.tagName.toLowerCase())
					{
						case "canvas":
							context.drawImage(layer, 0, 0, size.width, size.height);
							break;
						default:
							break;
					}
				}
			}
			return mergedImage.toDataURL();
		}
		this.down = function (x, y, pressure) {
			paintingLayer.style.opacity = layers[layerIndex].style.opacity * toolOpacity;
			paintingLayer.style.visibility = layers[layerIndex].style.visibility;
			if(tool.down)
				tool.down(x, y, pressure || tabletapi.pressure());
		}
		this.move = function (x, y, pressure) {
			if(tool.move)
				tool.move(x, y, pressure || tabletapi.pressure());
		}
		this.up = function (x, y, pressure) {
			if(tool.up)
				tool.up(x, y, pressure || tabletapi.pressure());
			var layer = layers[layerIndex];
			switch(layer.tagName.toLowerCase())
			{
				case "canvas":
					/*
					지우개툴이 아니라면 paintingLayer에 그려진 내용이 있으므로
					현재 선택된 레이어에 paintingLayer를 옮겨 그린 뒤
					paintingLayer의 내용을 지운다.
					*/
					if(!eraserTool)
					{
						var context = layer.getContext("2d");
						context.globalAlpha = toolOpacity;
						context.drawImage(paintingLayer, 0, 0, size.width, size.height);
						paintingContext.clearRect(0, 0, size.width, size.height);
					}
					break;
				default:
					break;
			}
		}
	}
	return Croquis;
});
<template>
  <div class="maintenancePlanAdd">
    <div class="panel-body">
      <div class="demo">
        <div class="draw-btn-group">
          <div :class="{active:currentType=='default'}" title="自由选择" @click="changeType('default')">
            <i class="draw-icon icon-mouse"></i>
          </div>
          <div :class="{active:currentType=='polygon'}" title="多边形" @click="changeType('polygon')">
            <i class="draw-icon icon-6"></i>
          </div>
          <el-upload
          style="height:30px;"
          action="#"
          :multiple="false"
          :show-file-list="false"
          :limit="1"
          accept=".json"
          :auto-upload="false"
          :on-change="openJson">
            <el-button title="加载JSON文件" class="pure_btn"><i class="draw-icon icon-upload"></i></el-button>
          </el-upload>
          <el-upload
            style="height:30px;"
            action="#"
            :multiple="false"
            :show-file-list="false"
            :limit="1"
            accept=".jpg,.jpeg,.png"
            :before-upload="onProgress"
          >
            <el-button title="从文件选择图片上传" class="pure_btn"><i class="draw-icon icon-img"></i></el-button>
          </el-upload>
          <!-- <div @click="uploadImg" title="从文件选择图片上传">
            <i class="draw-icon icon-img"></i>
          </div> -->
          <div @click="output" title="输出json">
            <i class="draw-icon icon-json_save"></i>
          </div>
          <div @click="clear" title="清空">
            <i class="draw-icon icon-clear"></i>
          </div>
        </div>
        <canvas id="canvas" :width="width" :height="height"></canvas>
      </div>
    </div>
    <div
      id="menu"
      class="menu-x"
      v-show="menuVisable"
      :style="menuPosition"
      @contextmenu.prevent=""
      ref="menu"
    >
      <div @click="delEl">删除</div>
    </div>
    <input type="file" @change="uploadImgChange" id="imgInput" accept="image/*" />
    <img id="img" :src="imgSrc" />
    <img id="expImg" src="../assets/icons/draw/exp.jpg" />
  </div>
</template>

<script>
/* eslint-disable */
import FileSaver from 'file-saver'
export default {
  name: 'paletteBoard',
  data () {
    return {
      width: 800,
      height: 600,
      rect: [],
      canvas: {},
      showMenu: false,
      x: '',
      y: '',
      mouseFrom: {},
      mouseTo: {},
      drawType: null, // 当前绘制图像的种类
      canvasObjectIndex: 0,
      textbox: null,
      rectangleLabel: 'warning',
      drawWidth: 2, // 笔触宽度
      color: '#E34F51', // 画笔颜色
      drawingObject: null, // 当前绘制对象
      moveCount: 1, // 绘制移动计数器
      doDrawing: false, // 绘制状态
      // polygon 相关参数
      polygonMode: false,
      pointArray: [],
      lineArray: [],
      activeShape: false,
      activeLine: '',
      line: {},
      delectKlass: {},
      imgFile: {},
      imgSrc: '',
      currentType: 'default',
      currentPolygon: null,
      menu: null,
      menuVisable: false, // 右键菜单显示状态
      menuPosition: '', // 右键菜单位置
      activeEl: null // 当前选中的元素
    }
  },
  mounted () {
    this.init()
  },
  methods: {
    init () {
      this.canvas = new fabric.Canvas('canvas', {
        fireRightClick: true, // 启用右键，button的数字为3
        stopContextMenu: true // 禁止默认右键菜单
      })
      this.canvas.on('mouse:down', this.canvasMouseDown) // 鼠标在画布上按下
      this.canvas.on('mouse:move', this.canvasMouseMove) // 鼠标在画布上移动
      this.canvas.on('mouse:dblclick', this.canvasMouseDblclick) // 鼠标在画布上双击
      // 按下鼠标
      this.canvas.on('mouse:down', this.canvasOnMouseDown)
    },
    delEl () {
      this.canvas.remove(this.activeEl)
      this.canvas.requestRenderAll()
      this.hiddenMenu()
    },
    hiddenMenu () {
      this.menuVisable = false
      this.activeEl = null
    },
    async canvasOnMouseDown (opt) {
      // 右键，且在元素上右键
      // button: 1-左键；2-中键；3-右键
      // 在画布上右键，target 为 null
      if (opt.button === 3 && opt.target) {
        // 获取当前元素
        this.activeEl = opt.target

        // 显示菜单
        this.menuVisable = true

        // await nextTick()
        this.$nextTick(() => {
          // 设置右键菜单位置
          // 1. 获取菜单组件的宽高
          const menuWidth = this.$refs.menu.offsetWidth
          const menuHeight = this.$refs.menu.offsetHeight

          // 当前鼠标位置
          let pointX = opt.pointer.x
          let pointY = opt.pointer.y

          if (this.canvas.width - pointX <= menuWidth) {
            pointX -= menuWidth
          }
          if (this.canvas.height - pointY <= menuHeight) {
            pointY -= menuHeight
          }

          this.menuPosition = `
            left: ${pointX}px;
            top: ${pointY}px;
          `
        })
      } else {
        this.hiddenMenu()
      }
    },
    changeType (val) {
      this.currentType = val
      switch (val) {
        case 'default':
          this.canvas.selection = true
          this.canvas.selectionColor = 'rgba(100, 100, 255, 0.3)'
          this.canvas.selectionBorderColor = 'rgba(255, 255, 255, 0.3)'
          this.canvas.skipTargetFind = false // 允许选中
          break
        case 'polygon':
          this.canvas.selectionColor = 'transparent'
          this.canvas.selectionBorderColor = 'transparent'
          this.canvas.skipTargetFind = true // 禁止选中
          break
      }
    },
    openJson (file) {
      const _this = this
      const reader = new FileReader()
      reader.onload = function () {
        if (reader.result) {
          // 初始化画布
          _this.init()
          // 反序列化
          _this.canvas.loadFromJSON(reader.result)
        }
      }
      reader.readAsText(file.raw)
    },
    createPolygon (e) {
      const currentPoint = e.absolutePointer
      this.currentPolygon = new fabric.Polygon(
        [
          { x: currentPoint.x, y: currentPoint.y },
          { x: currentPoint.x, y: currentPoint.y }
        ],
        {
          fill: 'transparent',
          stroke: 'rgba(255, 73, 112, 0.9)',
          objectCaching: false
        }
      )
      this.canvas.add(this.currentPolygon)
    },
    changeCurrentPolygon (e) {
      const currentPoint = e.absolutePointer

      const points = this.currentPolygon.points

      points.push({
        x: currentPoint.x,
        y: currentPoint.y
      })
      this.canvas.requestRenderAll()
    },
    // 多边形橡皮带
    changePolygonBelt (e) {
      const currentPoint = e.absolutePointer
      const points = this.currentPolygon.points

      points[points.length - 1].x = currentPoint.x
      points[points.length - 1].y = currentPoint.y

      this.canvas.requestRenderAll()
    },

    // 完成多边形绘制
    finishPolygon (e) {
      const currentPoint = e.absolutePointer
      const points = this.currentPolygon.points
      points[points.length - 1].x = currentPoint.x
      points[points.length - 1].y = currentPoint.y

      points.pop()
      points.pop()
      this.canvas.remove(this.currentPolygon)
      if (points.length > 1) {
        const polygon = new fabric.Polygon(points, {
          stroke: 'rgba(255, 73, 112, 0.9)',
          fill: 'transparent'
        })

        this.canvas.add(polygon)
      }

      this.currentPolygon = null
      this.canvas.requestRenderAll()
    },

    // 鼠标在画布上按下
    canvasMouseDown (e) {
      if (this.currentType === 'polygon') {
        if (this.currentPolygon === null) {
          this.createPolygon(e)
        } else {
          this.changeCurrentPolygon(e)
        }
      }
    },

    // 鼠标在画布上移动
    canvasMouseMove (e) {
      if (this.currentType === 'polygon' && this.currentPolygon) {
        this.changePolygonBelt(e)
      }
    },

    // 鼠标在画布上双击
    canvasMouseDblclick (e) {
      if (this.currentType === 'polygon') {
        this.finishPolygon(e)
      }
    },
    onProgress (file) {
      // 拿图片文件
      const reader = new FileReader()
      reader.readAsDataURL(file)

      // 图片文件完全拿到后执行
      reader.onload = () => {
        // 转换成base64格式
        const base64Img = reader.result

        // 将base64图片设置成背景
        this.canvas.setBackgroundImage(
          base64Img,
          this.canvas.renderAll.bind(this.canvas) // 刷新画布
        )
      }
      return false
    },
    // 导出json
    output () {
      console.log(this.canvas.toObject())
      const jsonData = JSON.stringify(this.canvas.toJSON())
      //   const jsonData = JSON.stringify(this.canvas.toObject())
      const blob = new Blob([jsonData], { type: '' })
      FileSaver.saveAs(blob, `${this.imgFile.name}.json`)
    },
    // 保存当前画布为png图片
    save () {
      const canvas = document.getElementById('canvas')
      let imgData = canvas.toDataURL('png')
      imgData = imgData.replace('image/png', 'image/octet-stream')
      // 下载后的问题名，可自由指定
      const filename = 'drawingboard_' + (new Date()).getTime() + '.' + 'png'
      this.saveFile(imgData, filename)
    },
    saveFile (data, filename) {
      const save_link = document.createElement('a')
      save_link.href = data
      save_link.download = filename
      const event = document.createEvent('MouseEvents')
      event.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
      save_link.dispatchEvent(event)
    },
    uploadImg () {
      document.getElementById('imgInput').click()
    },
    // 从已渲染的DOM元素加载图片至canvas
    loadExpImg () {
      const imgElement = document.getElementById('expImg') // 声明我们的图片
      const imgInstance = new fabric.Image(imgElement, {
        selectable: false
        // zIndex:-99,
      })
      this.canvas.add(imgInstance)
    },
    // 从文件加载图片至canvas
    uploadImgChange () {
      // 获取文件
      const eleImportInput = document.getElementById('imgInput')
      this.imgFile = eleImportInput.files[0]
      const imgSrc = ''
      let imgTitle = ''
      // 从reader中获取选择文件的src
      if (/\.(jpe?g|png|gif)$/i.test(this.imgFile.name)) {
        const reader = new FileReader()
        const _this = this
        reader.addEventListener(
          'load',
          function () {
            imgTitle = _this.imgFile.name
            _this.imgSrc = this.result
          },
          false
        )
        reader.readAsDataURL(this.imgFile)
      }
      const imgElement = document.getElementById('img') // 声明我们的图片
      imgElement.onload = () => {
        this.width = imgElement.width
        this.height = imgElement.height
        const imgInstance = new fabric.Image(imgElement, {
          zIndex: -1,
          selectable: false
        })
        this.canvas.add(imgInstance)
      }
    },
    clear () {
      this.canvas.clear()
      this.width = 800
      this.height = 600
      this.canvas.setDimensions({
        width: this.width,
        height: this.height
      })
    }
  }
}
</script>

<style lang="less" scoped>
.maintenancePlanAdd{
  box-sizing: border-box;
}
.el-container {
  flex-direction: column;
}
img,
input {
  display: none;
}
.demo {
  display: flex;
//   flex-direction: column;
//   align-items: center;
}
canvas {
  border: 1px dashed black;
}
.draw-btn-group {
  // width: 1270px;
  margin-top: 10px;
  margin-right: 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  & > div {
    background: #fafafa;
    cursor: pointer;
    &:hover {
      background: #eee;
    }
    i {
      display: flex;
      background-repeat: no-repeat;
      background-size: 80%;
      background-position: 50% 50%;
      height: 30px;
      width: 30px;
    }
    .icon-1 {
      background-image: url("../assets/icons/draw/1.png");
    }
    .icon-pentagram {
      background-image: url("../assets/icons/draw/pentagram.png");
    }
    .icon-2 {
      background-image: url("../assets/icons/draw/2.png");
    }
    .icon-3 {
      background-image: url("../assets/icons/draw/3.png");
    }
    .icon-4 {
      background-image: url("../assets/icons/draw/4.png");
      background-size: 75%;
    }
    .icon-5 {
      background-image: url("../assets/icons/draw/5.png");
      background-size: 70%;
    }
    .icon-6 {
      background-image: url("../assets/icons/draw/6.png");
    }
    .icon-7 {
      background-image: url("../assets/icons/draw/7.png");
      background-size: 80%;
    }
    .icon-del {
      background-image: url("../assets/icons/draw/del.png");
      background-size: 90%;
    }
    .icon-img {
      background-image: url("../assets/icons/draw/img.png");
      background-size: 80%;
    }
    .icon-back {
      background-image: url("../assets/icons/draw/back.png");
      background-size: 75%;
    }
    .icon-save {
      background-image: url("../assets/icons/draw/save.png");
      background-size: 80%;
    }
    .icon-upload {
      background-image: url("../assets/icons/draw/upload.png");
      background-size: 70%;
    }
    .icon-json_save {
      background-image: url("../assets/icons/draw/json_save.png");
      background-size: 80%;
    }
    .icon-clear {
      background-image: url("../assets/icons/draw/clear.png");
      background-size: 80%;
    }
    .icon-mouse {
      background-image: url("../assets/icons/draw/mouse.png");
      background-size: 60%;
    }
  }
  .active {
    background: #eee;
  }
}
.menu-x {
  width: 200px;
  position: absolute;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);

  div {
    box-sizing: border-box;
    padding: 4px 8px;
    border-bottom: 1px solid #ccc;
    cursor: pointer;

    &:hover {
      background-color: antiquewhite;
    }

    &:first-child {
      border-top-left-radius: 4px;
      border-top-right-radius: 4px;
    }

    &:last-child {
      border-bottom: none;
      border-bottom-left-radius: 4px;
      border-bottom-right-radius: 4px;
    }
  }
}
</style>

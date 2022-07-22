<template>
  <div class="index_wrap">
    <div class="main_wrap">
      <PaletteTest></PaletteTest>
      <!-- <PaletteBoard></PaletteBoard> -->
    </div>
    <RightSide></RightSide>
  </div>
</template>

<script>
/* eslint-disable */
import PaletteTest from './paletteTest'
import PaletteBoard from './paletteBoard'
import RightSide from './rightSide'
export default {
  components: { RightSide, PaletteBoard, PaletteTest },
  data () {
    return {

    }
  },
  watch: {
  },
  methods: {
  }
}
</script>

<style lang="less" scoped>
.index_wrap {
  box-sizing: border-box;
  background-color: #fafafa;
  width: 1160px;
  height: 720px;
  display: flex;
  .main_wrap{
    align-self: center;
  }
}
</style>

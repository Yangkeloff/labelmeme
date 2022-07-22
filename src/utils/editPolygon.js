import { fabric } from 'fabric'

/* eslint-disable */

// define a function that can locate the controls.
// this function will be used both for drawing and for interaction.
function polygonPositionHandler (dim, finalMatrix, fabricObject) {
  const x = (fabricObject.points[this.pointIndex].x - fabricObject.pathOffset.x)
  const y = (fabricObject.points[this.pointIndex].y - fabricObject.pathOffset.y)
  return fabric.util.transformPoint(
    { x: x, y: y },
    fabric.util.multiplyTransformMatrices(
      fabricObject.canvas.viewportTransform,
      fabricObject.calcTransformMatrix()
    )
  )
}

function getObjectSizeWithStroke (object) {
  const stroke = new fabric.Point(
    object.strokeUniform ? 1 / object.scaleX : 1,
    object.strokeUniform ? 1 / object.scaleY : 1
  ).multiply(object.strokeWidth)
  return new fabric.Point(object.width + stroke.x, object.height + stroke.y)
}

// define a function that will define what the control does
// this function will be called on every mouse move after a control has been
// clicked and is being dragged.
// The function receive as argument the mouse event, the current trasnform object
// and the current position in canvas coordinate
// transform.target is a reference to the current object being transformed,
function actionHandler (eventData, transform, x, y) {
  const polygon = transform.target
  const currentControl = polygon.controls[polygon.__corner]
  const mouseLocalPosition = polygon.toLocalPoint(new fabric.Point(x, y), 'center', 'center')
  const polygonBaseSize = getObjectSizeWithStroke(polygon)
  const size = polygon._getTransformedDimensions(0, 0)
  const finalPointPosition = {
    x: mouseLocalPosition.x * polygonBaseSize.x / size.x + polygon.pathOffset.x,
    y: mouseLocalPosition.y * polygonBaseSize.y / size.y + polygon.pathOffset.y
  }
  polygon.points[currentControl.pointIndex] = finalPointPosition
  return true
}

// define a function that can keep the polygon in the same position when we change its
// width/height/top/left.
function anchorWrapper (anchorIndex, fn) {
  return function (eventData, transform, x, y) {
    const fabricObject = transform.target
    const absolutePoint = fabric.util.transformPoint({
      x: (fabricObject.points[anchorIndex].x - fabricObject.pathOffset.x),
      y: (fabricObject.points[anchorIndex].y - fabricObject.pathOffset.y)
    }, fabricObject.calcTransformMatrix())
    const actionPerformed = fn(eventData, transform, x, y)
    const newDim = fabricObject._setPositionDimensions({})
    const polygonBaseSize = getObjectSizeWithStroke(fabricObject)
    const newX = (fabricObject.points[anchorIndex].x - fabricObject.pathOffset.x) / polygonBaseSize.x
    const newY = (fabricObject.points[anchorIndex].y - fabricObject.pathOffset.y) / polygonBaseSize.y
    fabricObject.setPositionByOrigin(absolutePoint, newX + 0.5, newY + 0.5)
    return actionPerformed
  }
}

function Edit (canvas, curPoly) {
  // clone what are you copying since you
  // may want copy and paste on different moment.
  // and you do not want the changes happened
  // later to reflect on the copy.

  // const poly = canvas.getObjects()[0]
  const poly = curPoly
  canvas.setActiveObject(poly)
  poly.edit = !poly.edit
  if (poly.edit) {
    const lastControl = poly.points.length - 1
    poly.cornerStyle = 'circle'
    poly.cornerColor = 'rgba(0,0,255,0.5)'
    poly.controls = poly.points.reduce(function (acc, point, index) {
      acc['p' + index] = new fabric.Control({
        positionHandler: polygonPositionHandler,
        actionHandler: anchorWrapper(index > 0 ? index - 1 : lastControl, actionHandler),
        actionName: 'modifyPolygon',
        pointIndex: index
      })
      return acc
    }, { })
  } else {
    poly.cornerColor = 'blue'
    poly.cornerStyle = 'rect'
    poly.controls = fabric.Object.prototype.controls
  }
  poly.hasBorders = !poly.edit
  canvas.requestRenderAll()
}

export {
  Edit
}

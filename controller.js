(function(){

Origami.fastclick(document.body);

var findCellFromTouch = function(event){
  var touch = event.changedTouches ? event.changedTouches[0] : event;
  var el = document.elementFromPoint(touch.clientX, touch.clientY);
  return el.__vfrag__ ? el.__vfrag__.raw : false;
}
var hsl = function(h, s, l){
  return 'hsl(' + h + ',' + Math.round(s) + '%,' + Math.round(l) + '%)';
}

new Vue({
  el: 'body',
  data: {
    game: window.Game,

    // ui settings
    saturate: 80,
    lightness: 75,
    lightness_shadow: -25,
    lightness_shadow_invert: 9,
    lightness_text_ratio: 0.25,

    hold_threshold: 200,

    // runtime variables
    dragging: false,
    moved: false,
    hold_handle: 0,
    holding: false,
    through_cells: [],

    show_stat: false
  },
  computed: {
    defaultStyle: function(){
      return this.colorStyle(0, 0, 1);
    },
    levelStyle: function(){
      return this.colorStyle(this.game.level == 2 ? 120 : 0, 1, 1);
    },
    hudStyle: function(){
      return this.colorStyle(60, 1, 1.13);
    },
    hudStyle2: function(){
      return this.colorStyle(110, 1, 1.13);
    },
    fieldStyle: function(){
      var primeRatio = this.game.primeRatio();
      return {"background-color": primeRatio === null
        ? hsl(0, 0, 85)
        : (this.game.level == 2
          ? hsl(170 - Math.round(primeRatio * 160), 50, 85)
          : hsl(210 + Math.round(primeRatio * 140), 30, 30)
        )};
    },
    statStyle: function(){
      return {"background-color": hsl(200, 90, 90)};
    }
  },
  filters: {
    text: function(cell){
      return cell.text();
    },
    style: function(cell){
      return this.colorStyle(cell.hue(), cell.saturate(), cell.lightness(), cell.active);
    }
  },
  methods: {
    colorStyle: function(h, s, l, invert){
      s *= this.saturate;
      l *= this.lightness;
      return {
        "background-color": hsl(h, s, l),
        "color": hsl(h, s, l * this.lightness_text_ratio),
        "box-shadow": '0 1vmin ' + (invert
          ? hsl(h, s, l + this.lightness_shadow_invert)// + ' inset'
          : hsl(h, s, l + this.lightness_shadow))
      };
    },
    onDragStart: function(cell){
      cell.active = true;
      cell.dragStart();
      this.through_cells = [cell];
      this.dragging = true;
      this.moved = false;
      var that = this;
      this.resetHold();
      this.hold_handle = setTimeout(function(){ that.onHold(cell); }, that.hold_threshold);
    },
    onDrag: function(cell, event){
      this.resetHold();
      if( event ){
        cell = findCellFromTouch(event); if( !cell ) return;
      }
      if( this.dragging ){
        if( this.through_cells.length > 1 && cell == this.through_cells[0] ){
          cell.dragReturn();
        } else {
          if( this.through_cells.indexOf(cell) === -1 && cell.dragThrough(this.through_cells) ){
            cell.active = true;
            this.through_cells.push(cell);
          }
        }
        this.moved = true;
      }
    },
    onDragEnd: function(cell, event){
      if( event ){
        cell = findCellFromTouch(event); if( !cell ) return this.onLeave(event);
      }
      if( this.dragging ){
        // use this instead of click/tap event for mobile Safari
        if( this.through_cells.length == 1 && !this.moved ){
          if( this.holding ){
            cell.held();
          } else {
            cell.tapped();
          }
        } else if( this.through_cells.length > 1 && this.through_cells.indexOf(cell) !== -1 ){
          this.through_cells[0].dragged(this.through_cells.slice(1));
        }
        this.resetDrag();
        this.game.check();
      }
    },
    onLeave: function(){
      this.resetDrag();
    },
    resetDrag: function(){
      this.through_cells.forEach(function(c){
        c.active = false;
      });
      this.dragging = false;
      this.moved = false;
      this.through_cells = [];
      this.game.resetDrag();
      this.resetHold();
    },
    resetHold: function(){
      clearTimeout(this.hold_handle);
      this.hold_handle = 0;
      this.holding = false;
    },
    onHold: function(cell){
      cell.holding();
      this.holding = true;
    }
  },
  created: function(){
    this.game.reset();
  }
});

}());
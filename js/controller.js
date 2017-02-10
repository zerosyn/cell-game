(function(){

window.viewportUnitsBuggyfill.init();
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
  el: 'html',
  data: {
    game: window.Game,
    settings: {},

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

    hud_swipe_y: 0,

    display: 'game',
    stat_level: 2
  },
  computed: {
    bodyStyle: function(){
      return {"background-color": this.game.level == 2 ? 'white' : 'black'};
    },
    defaultStyle: function(){
      return this.colorStyle(0, 0, 1.3);
    },
    levelStyle: function(){
      return this.colorStyle(this.game.level == 2 ? 120 : 0, 1, 1);
    },
    hudStyle: function(){
      return this.game.level == 2
        ? this.colorStyle(60, 1, 1.13)
        : this.colorStyle(320, 0.3, 0.8);
    },
    fieldStyle: function(){
      return this.game.level == 2
        ? this.colorStyle(110, 0.7, 1.13)
        : this.colorStyle(240, 0.2, 0.5);
    },
    statStyle: function(){
      return this.game.level == 2
        ? this.colorStyle(200, 1.1, 1.2)
        : this.colorStyle(200, 0.3, 1);
    },
    levelScores: function(){
      return this.game.stat[this.stat_level];
    }
  },
  filters: {
    text: function(cell){
      return cell.text();
    },
    style: function(cell){
      return this.colorStyle(cell.hue(), cell.saturate(), cell.lightness(), cell.active);
    },
    levelText: function(level){
      return level == 2 ? 'Easy' : 'Hard';
    },
    translate: function(str){
      var translated = (window.translation && this.settings.lang != 'English') ? translation[str] : str;
      return translated ? translated : str;
    },
  },
  created: function(){
    this.settings = Stat.load('setting', {
      'lang': navigator.language.indexOf('zh') == 0 ? '中文' : 'English'
    });
  },
  methods: {
    changeLang: function(){
      this.settings.set('lang', this.settings.lang == 'English' ? '中文' : 'English');
    },
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
    },
    onHudDrag: function(event, move){
      var touch = event.changedTouches ? event.changedTouches[0] : event;
      if( move ){
        document.getElementById('achievements').scrollTop += this.hud_swipe_y - touch.clientY;
      }
      this.hud_swipe_y = touch.clientY;
    }
  }
});

}());
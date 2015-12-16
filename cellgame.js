Object.defineProperty(Array.prototype, "sortAsc", {
  enumerable: false,
  value: function() {
    return this.sort(function(a, b){
      return a - b;
    });
  }
});
Object.defineProperty(Array.prototype, "sortDesc", {
  enumerable: false,
  value: function() {
    return this.sort(function(a, b){
      return b - a;
    });
  }
});
Object.defineProperty(Array.prototype, "multiply", {
  enumerable: false,
  value: function() {
    return this.reduce(function(old, v){
      return old * v;
    }, 1);
  }
});
Object.defineProperty(Array.prototype, "unique", {
  enumerable: false,
  value: function() {
    return this.reduce(function(p, c) {
      if (p.indexOf(c) < 0) p.push(c);
      return p;
    }, []);
  }
});
Object.defineProperty(Array.prototype, "intersect", {
  enumerable: false,
  value: function(arr2){
    return this.filter(function(v){
      return arr2.indexOf(v) !== -1;
    });
    // .filter(function (e, i, c) { // extra step to remove duplicates
    //   return c.indexOf(e) === i;
    // });
  }
});
// base on sorted array
Object.defineProperty(Array.prototype, "commonFactors", {
  enumerable: false,
  value: function(arr2) {
    var j = 0, len = arr2.length, result = [];
    this.forEach(function(v){
      while(arr2[j] < v && j < len){
        ++ j;
      }
      if( j == len ) return;
      if( arr2[j] == v ){
        result.push(v);
        ++ j;
        return;
      }
    });
    return result;
  }
});

(function(){
  var primes = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97];
  var worthy_primes = [2,3,5,7];
  Math.factorize = function(x){
    var result = [], i, p;
    while( x > 1 ){
      if( primes.indexOf(x) !== -1 ){
        result.push(x);
        break;
      }
      for( i in worthy_primes ){
        p = worthy_primes[i];
        if( x % p == 0 ){
          x /= p;
          result.push(p);
        }
      }
    }
    return result.sortAsc();
  }
  Math.randomInt = function(min, max) {
    return Math.floor(Math.random() * (max + 1 - min)) + min;
  }
}());



window.Stat = (function(){

  var ls = window.localStorage;
  var ranking_count = 3;

  var Data = function(namespace){
    this.namespace = namespace;
    this.reset();
  }

  Data.prototype.reset = function(){
    this.score_ranking = [0];
    this.best_combo = 0;
    this.best_combo_detail = {};
    this.max_gcd = 0;
    this.max_power = 0;
    this.max_turn = 0;
    this.total_round = 0;
  }

  Data.keys = Object.getOwnPropertyNames(new Data());

  Data.load = function(namespace){
    var stat = new Data(namespace);
    Data.keys.forEach(function(key){
      var value = ls.getItem(namespace + '.' + key);
      if( value !== null && value !== undefined ){
        try{
          value = JSON.parse(value);
        } catch(err) {}
        stat[key] = value;
      }
    });
    return stat;
  }

  Data.prototype.set = function(key, value){
    this[key] = value;
    if( typeof value == 'object' ){
      value = JSON.stringify( value );
    }
    ls.setItem(this.namespace + '.' + key, value);
  };
  Data.prototype.checkBestAndSet = function(key, value){
    if( this[key] >= value ) return false;
    this.set(key, value);
    return true;
  };
  Data.prototype.checkRankingAndSet = function(key, value){
    var ranking = this[key];
    ranking.push(value);
    ranking = ranking.filter(function(v){ return v > 0; });
    ranking.sortDesc().splice(ranking_count - 1, ranking.length);
    this.set(key, ranking);
  };
  Data.prototype.inc = function(key, value){
    this.set(key, this[key] + value);
  };
  Data.prototype.clear = function(){
    this.reset();
    Data.keys.forEach(function(key){
      ls.removeItem(this.namespace + '.' + key)
    });
  };

  return Data;
}());



window.Game = (function(){

var level_limit = 4;

var Game = function(){
  this.cells = [];
  this.dimention = 4;
  this.level = 2;
  this.gameover = false;
  this.score = 0;
  this.turn = 0;
  this.prompt = '';
  this.stat = {
    2: Stat.load(2),
    3: Stat.load(3)
  };
}
Game.prototype.reset = function(){
  var i, j, row;
  var cells = [];
  for( i = 0; i < this.dimention; ++ i ){
    row = [];
    for( j = 0; j < this.dimention; ++ j ){
      row.push(new Cell(i, j));
    }
    cells.push(row);
  }
  this.cells = cells;
  this.gameover = false;
  this.score = 0;
  this.turn = 0;
  this.prompt = '';
  this.check();
}
Game.prototype.changeLevel = function(){
  this.level = Math.max(2, (this.level + 1) % level_limit);
}
Game.prototype.levelText = function(){
  return this.level == 2 ? 'Easy' : 'Hard';
}
Game.prototype.numberLimit = function(){
  return this.level == 2 ? 99 : 50;
}
Game.prototype.changeScore = function(gcd, power){
  var combo = Math.pow(gcd, power);
  this.score += combo;

  var stat = this.stat[this.level];
  if( stat.checkBestAndSet('best_combo', combo) ){
    stat.set('best_combo_detail', {gcd: gcd, power: power});
  }
  stat.checkBestAndSet('max_gcd', gcd);
  stat.checkBestAndSet('max_power', power);
}
Game.prototype.nextTurn = function(){
  ++ this.turn;
  this.stat[this.level].checkBestAndSet('max_turn', this.turn);
}
Game.prototype.resetPrompt = function(){
  this.prompt = '';
}
Game.prototype.resetDrag = function(){
  this.resetPrompt();
}
Game.prototype.around = function(cell){
  var i, cords = [[cell.row-1, cell.col], [cell.row+1, cell.col], [cell.row, cell.col-1], [cell.row, cell.col+1]], cord, result = [];
  for( i in cords ){
    cord = cords[i];
    if( cord[0] < 0 || cord[0] >= this.dimention || cord[1] < 0 || cord[1] >= this.dimention ) continue;
    result.push(this.cells[cord[0]][cord[1]]);
  }
  return result;
}
Game.prototype.primeRatio = function(){
  var countPrime = 0, countAll = 0, cell;
  for( var i in this.cells ){
    for( var j in this.cells[i] ){
      cell = this.cells[i][j];
      if( cell.number == 1 ) continue;
      if( cell.isPrime() ) ++ countPrime;
      ++ countAll;
    }
  }
  return countAll ? countPrime / countAll : null;
}
Game.prototype.notCheckmate = function(){
  var that = this;
  var checkRecursive = function(cells, cf, depth){
    var around_cells = that.around(cells[0]), around_cell, tmp_cf, clone;
    for( var k in around_cells ){
      around_cell = around_cells[k];
      if( cells.indexOf(around_cell) !== -1 ) continue; // 忽略走过的路径
      tmp_cf = cf.commonFactors(around_cell.factors);
      if( tmp_cf.length == 0 ) continue;  // 忽略互质的
      if( depth + 1 >= that.level ) return true;  // 足够深度
      // 压栈递归
      clone = cells.slice(0);
      clone.unshift(around_cell);
      if( checkRecursive(clone, tmp_cf, depth + 1) ) return true;
    }
    return false;
  };
  var cell;
  for( var i in this.cells ){
    for( var j in this.cells[i] ){
      cell = this.cells[i][j];
      if( cell.number == 1 ) return true;
      if( checkRecursive([cell], cell.factors, 1) ) return true;
    }
  }
  return false;
}
Game.prototype.check = function(){
  if( !this.notCheckmate() ){
    this.gameover = true;
    this.stat[this.level].checkRankingAndSet('score_ranking', this.score);
    this.stat[this.level].inc('total_round', 1);
  }
}

return new Game();
}());



window.Cell = (function(){

var Cell = function(row, col, num){
  if( num ){
    this.set(num);
  } else {
    this.rand();
  }
  this.row = row;
  this.col = col;
  this.active = false;
}

/* required methods */
Cell.prototype.text = function(){
  return this.number;
}
Cell.prototype.hue = function(){
  if( !this.isPrime() ) return 200;// + this.factors.unique().length * 10;
  if( this.number < 10 ) return 0;//30 - this.number * 4;
  return 0;
}
Cell.prototype.saturate = function(){
  return this.number > 1 ? 1 : 0;
}
Cell.prototype.lightness = function(){
  return this.number > 1 ? (1 - this.number / 1000) : 1.3;
}

Cell.prototype.tapped = function(){
  if( this.number != 1 ) return false;
  Game.around(this).forEach(function(around_cell){
    around_cell.tappedBy();
  });
  this.rand();
  Game.nextTurn();
}
Cell.prototype.tappedBy = function(cellCenter){
  if( this.number == 1 ){
    this.rand();
  } else {
    this.set(this.number - 1);
  }
}
var dragging_factors = [];
Cell.prototype.dragStart = function(){
  dragging_factors = this.factors;
}
Cell.prototype.dragThrough = function(through_cells){
  var cf = dragging_factors.commonFactors(this.factors);
  if( cf.length == 0 ) return false;
  if( Game.around(this).intersect(through_cells).length == 0 ) return false;

  dragging_factors = cf;
  var gcd = dragging_factors.multiply();
  Game.prompt = gcd + '<sup> ' + through_cells.length + '</sup> <mark>=</mark> ' + Math.pow(gcd, through_cells.length);
  return true;
}
Cell.prototype.dragReturn = function(){
}
Cell.prototype.dragged = function(through_cells){
  if( this.number == 1 || dragging_factors.length == 0 || through_cells.length < Game.level - 1 ) return false;

  var gcd = dragging_factors.multiply();
  through_cells.forEach(function(through_cell){
    through_cell.set(through_cell.number / gcd);
  });
  this.set(this.number / gcd);
  dragging_factors = [];
  Game.changeScore(gcd, through_cells.length);
  Game.nextTurn();
}
Cell.prototype.holding = function(){
  Game.prompt = this.number == 1 ? "(๑• . •๑)" : this.factors.join(' <mark>×</mark> ');
}
Cell.prototype.held = function(){
  if( this.number == 1 ) this.tapped();
}

/* custom methods */
Cell.prototype.set = function(num){
  this.number = num;
  this.factors = Math.factorize(num);
}
Cell.prototype.rand = function(){
  this.set(Math.randomInt(1, Game.numberLimit()));
}
Cell.prototype.isPrime = function(){
  return this.factors.length == 1;
}
// Cell.prototype.isCoprime = function(cell2){
//   return this.factors.every(function(v){
//     return cell2.factors.indexOf(v) === -1;
//   });
// }

return Cell;
}());



Game.reset(); // 因为有依赖，必须在 Cell 定义后执行
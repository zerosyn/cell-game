window.Stat = (function(){

  var ls = window.localStorage;
  var ranking_count = 3;

  var Data = function(namespace, defaults){
    this.namespace = namespace;
    this.defaults = defaults;
    this.reset();
  }

  Data.prototype.reset = function(){
    this.keys = [];
    for( var key in this.defaults ){
      this[key] = this.defaults[key];
      this.keys.push(key);
    }
  }

  Data.load = function(namespace, defaults){
    var stat = new Data(namespace, defaults);
    for( var key of stat.keys ){
      var value = ls.getItem(namespace + '.' + key);
      if( value !== null && value !== undefined ){
        try{
          value = JSON.parse(value);
        } catch(err) {}
        stat[key] = value;
      }
    }
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
    for( var key of this.keys ){
      ls.removeItem(this.namespace + '.' + key)
    }
  };

  return Data;
}());

window.Achievements = (function(){
  var settings = {
    board: {  // inputs are cells & gameover flag
      'Prime Liker':  function(input){ return input.cells.reduce(function(count, c){ return count + c.isPrime() * 1; }, 0) == 16; }, // All prime
      'Prime Hater':  function(input){ return input.cells.reduce(function(count, c){ return count + c.isComposite() * 1; }, 0) == 16; }, // All composite
      'One': {
        formula: function(input){ return input.cells.reduce(function(count, c){ return count + (c.number == 1) * 1; }, 0); },
        map: {
          'One Seeker': 8,
          'One Maniac': 12,
          'Colorless': 16
        }
      },
      'Coprime Doom': function(input){ return input.gameover && input.cells.reduce(function(count, c){ return count + c.isComposite() * 1; }, 0) >= 8; }  // End with 8+ composite
    },
    combo: { // inputs are gcd & combo cells
      'Power': {
        formula: function(input){ return input.cells.length; },
        map: {
          'Octadic': 8,
          'A Dozen': 12,
          'Grand Slam': 16
        }
      },
      'Divisor': { // power >= 2 & GCD >= x
        formula: function(input){ return input.cells.length > 2 ? input.gcd : 0; },
        map: {
          'Divisor Rookie': 20,
          'Divisor Veteran': 40,
          'Divisor Master': 60
        }
      },
      'Equalitarian': { // same
        formula: function(input){
          var n = 0, counts = {}, max_count = 0;
          for( var cell of input.cells ){
            n = cell.number;
            if( !counts[n] ) counts[n] = 0;
            counts[n] += 1;
            if( counts[n] > max_count ) max_count = counts[n];
          }
          return max_count;
        },
        map: {
          'Equalitarian Rookie': 4,
          'Equalitarian Veteran': 6,
          'Equalitarian Master': 8
        }
      },
      'Factorization': { // different composite
        formula: function(input){
          var n = 0, composites = {};
          for( var cell of input.cells ){
            if( !cell.isComposite() ) continue;
            composites[cell.number] = true;
          }
          return Object.keys(composites).length;
        },
        map: {
          'Factorization Rookie': 6,
          'Factorization Veteran': 8,
          'Factorization Master': 10
        }
      }
    },
    score: { // input is combo score
      '1024': function(input){ return input.score == 1024; },
      'GCD': {
        formula: function(input){ return input.score; },
        map: {
          'GCD Rookie':  10000,
          'GCD Veteran': 100000,
          'GCD Master':  1000000,
          'GCD Emperor': 10000000
        }
      }
    },
    one: { // 1 effect, inputs are old around cells & new around cells & self
      'Rejuvenated':         function(input){ return input.old.length == 4 && input.old.every(function(c){ return c.isPrime(); }) && input.new.every(function(c){ return c.isComposite(); }); },     // change all 4 prime to composite
      'Bloody':              function(input){ return input.old.length == 4 && input.old.every(function(c){ return c.isComposite(); }) && input.new.every(function(c){ return c.isPrime(); }); },     // change all 4 composite to prime
      'Composite Successor': function(input){ return input.old.length == 4 && input.old.every(function(c){ return c.isComposite(); }) && input.new.every(function(c){ return c.isComposite(); }); }, // change all 4 composite to composite
      'Quadruplication':     function(input){ return input.old.length == 4 && input.old.every(function(c){ return c.number == 2; }); }, // change all 4 two to one
      'Unshakable':          function(input){ return input.self.number == 1; } // keep 1 after random
    },
    accumulate: { // inputs are turn
      'Turn': {
        formula: function(input){ return input.turn; },
        map: {
          'Libido':    100,
          'Longevous': 500,
          'Immortal':  1000
        }
      }
      // 'Immersed': false,  // play 1 hour
    }
  };
  var keys = [], map = {};
  for( var group in settings ){
    for( var key in settings[group] ){
      keys.push(key);
      map[key] = false;
    }
  }
  var data = Stat.load('achievement', map);

  var trigger = function(group, input){
    var setting, result;
    for( var key in settings[group] ){
      setting = settings[group][key];
      result = false;
      if( typeof setting === 'function' ){
        if( !data[key] ){
          result = setting(input) ? key : false;
        }
      } else {
        var formula_result = setting['formula'](input);
        for( var k in setting['map'] ){ // 区间划分必须从小到大
          if( formula_result >= setting['map'][k] ){
            result = k;
          }
        }
      }
      if( result ){
        data.set(key, result);
      }
    }
  };

  return {
    data: data,
    trigger: trigger
  };
}());
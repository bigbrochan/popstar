window.onload = function() {
    //并查集的类-----------------------------------------------------------------------------------
    //包含set,group(根与集合下标的数组组成的键值对)
    class Uset {
        constructor(n) {
            //初始化并查集，set为实例中并查集的值，n为并查集元素的个数，
            //set中的初始值都为-1，表示用n个集合，每个集合的元素数量都为1
            this.set = new Array(n).fill(-1)
        }

        //实例方法find,用来查找x位置所在的集合，返回集合根元素的位置
        //find最终会路径压缩，所在的位置的值最终等于根元素的位置（下标）
        find(x) {
            //找到根元素位置并做路径压缩
            return this.set[x] < 0 ? x : this.set[x] = this.find(this.set[x])
        }

        //并查集的合并,根据实际需求选用的是元素个数的合并,即根元素上的值代表
        //集合元素个数；
        //还有一种是查找深度的合并，根元素上的值代表集合的最大深度
        union(x, y) {
            var xroot = this.find(x)
            var yroot = this.find(y)
            if (xroot === yroot) {
                //在相同的集合中，什么也不做，返回this
                return this
            } else {
                //不同的集合中，大集合根元素的值为两个根元素上值之和；
                //小集合的元素上的值变成大集合根元素的位置
                if (this.set[xroot] <= this.set[yroot]) {
                    this.set[xroot] += this.set[yroot]
                    this.set[yroot] = xroot
                } else {
                    this.set[yroot] += this.set[xroot]
                    this.set[xroot] = yroot
                }
                return this
            }
        }

        //判断并查集中是否所有的集合个数都为1；
        //在游戏的结束条件判断中会用到
        allSingle() {
            return this.set.every(it => it > -2)
        }

        //最终压缩并把每一个集合纪录，方面后面游戏楚时判断所在的集合
        zip() {
            var group = this.group = {}
            var set = this.set
            for (var i = 0; i < set.length; i++) {
                var _root = this.find(i)
                if (!group[_root]) {
                    group[_root] = []
                }
                group[_root].push(i)
            }
            return this
        }
    }
    //简易实现一个事件发生器的类-------------------------------------------------------------------
    class Emitter {
        constructor() {
            this.listeners = new Map()
        }

        //添加事件的方法
        on(name, handler) {
            this.listeners.has(name) || this.listeners.set(name, [])
            var _listener = this.listeners.get(name)
            _listener.indexOf(handler) !== -1 || _listener.push(handler)
        }


        //触发事件的方法
        emit(name, ...args) {
            var _listener = this.listeners.get(name)
            if (_listener && _listener.length) {
                _listener.forEach(handler => {
                    handler(...args)
                })
                return true
            }
            return false
        }

        //取消事件的方法
        clear(name, handler) {
            var _listener = this.listeners.get(name)
            var index = _listener && _listener.length ? _listener.indexOf(handler) : -1
            if (index !== -1) {
                _listener.splice(index, 1)

                return true
            }
            return false

        }

    }
    //--------------------------------------------------------------------------------------------
    //全局观察者的类------------------------------------------------------------------------------
    class EventBus {
        static on(ele, name, handler) {
            ele.on(name, handler)
            return this
        }
        static emit(ele, name, ...args) {
            ele.emit(name, ...args)
            return this
        }
    }
    //--------------------------------------------------------------------------------------------
    //游戏数据的类--------------------------------------------------------------------------------
    //包含data二维数组,x,y,colors,uset
    class Stars extends Emitter {
        constructor(app, useLocal) {
            super()
            this.colors = app.starData.colors.slice()
            this.x = app.starData.x
            this.y = app.starData.y
            useLocal ? this.data = JSON.parse(JSON.stringify(app.local.matrix)) : this.init()
            this.usetfy()
        }

        //随机取得0-n的整数的静态方法
        static getRandomIndex(n) {
            return Math.floor(Math.random() * n)
        }

        static matrix(ary) {
            var res = []
            var n = Math.sqrt(ary.length)
            for (var i = 0; i < ary.length; i++) {
                var y = i % n
                var x = (i - y) / n
                if (!y) {
                    res.push([])
                }
                res[res.length - 1].push(ary[i])
            }
            return res
        }

        //初始化数据，生成model的二维数组，代表每个星星的信息
        //二维数组的值代表不同星星
        init() {
            var ary = []
            for (var i = 0; i < this.x * this.y; i++) {
                ary.push(Stars.getRandomIndex(this.colors.length))
            }
            this.data = Stars.matrix(ary)
            console.log()
            return this
        }

        //遍历二维数组,把相邻的值相同的放入一个集合
        //这个方法是这个游戏逻辑算法中最基础也是最重要的算法。。。lol.....-----
        usetfy() {
            var x = this.x,
                y = this.y
            var n = x * x
            var uset = this.uset = new Uset(n)
            var ary = this.data
            for (var i = 0; i < y; i++) {
                for (var j = 1; j < x; j++) {
                    if (ary[i][j] !== null && ary[i][j - 1] !== null && ary[i][j] === ary[i][j - 1]) {
                        uset.union(i * x + j - 1, i * x + j)
                    }
                }
            }

            for (var i = 0; i < x; i++) {
                for (var j = 1; j < y; j++) {
                    if (ary[j - 1][i] !== null && ary[j][i] !== null && ary[j - 1][i] === ary[j][i]) {
                        uset.union((j - 1) * x + i, j * x + i)
                    }
                }
            }
            uset.zip()
            return this
        }
    }
    //---------------------------------------------------------------------------------------------
    //积分系统的类--------------------------------------------------------------------------------
    //包含level(关卡)，goal(目标)，currScore(当前积分)，bonus(奖励积分),remain(剩余多少个)
    //继承自Emitter
    class Score extends Emitter {
        constructor(app, useLocal) {
            super()
            this.init(app, useLocal)
            this.bind()
            this.gameover = false
        }
        init(app, useLocal) {
            var initalScore = app.initialScore
            var local = app.local
            this._record = local.record
            this._level = useLocal ? local.level : initalScore.level
            this._goal = useLocal ? local.goal : initalScore.goal
            this._remain = initalScore.remain
            this._bonus = initalScore.bonus
            this._score = useLocal ? local.score : initalScore.score
            this.success = useLocal ? local.success : initalScore.isSuccess
            this.recordDOM = document.querySelectorAll(initalScore.recordDOM)
            this.goodDOM = document.querySelector(initalScore.goodDOM)
            this.betterDOM = document.querySelector(initalScore.betterDOM)
            this.bestDOM = document.querySelector(initalScore.bestDOM)
            this.successDOM = document.querySelector(initalScore.successDOM)
            this.levelDOM = document.querySelector(initalScore.levelDOM)
            this.goalDOM = document.querySelector(initalScore.goalDOM)
            this.remainDOM = document.querySelector(initalScore.remainDOM)
            this.bonusDOM = document.querySelector(initalScore.bonusDOM)
            this.scoreDOM = document.querySelector(initalScore.scoreDOM)
            this.clearAmountDOM = document.querySelector(initalScore.clearAmountDOM)
            this.clearScoreDOM = document.querySelector(initalScore.clearScoreDOM)
            this.levelDOM.innerHTML = this._level
            this.goalDOM.innerHTML = this._goal
            this.remainDOM.innerHTML = initalScore.remain
            this.bonusDOM.innerHTML = initalScore.bonus
            this.scoreDOM.innerHTML = this._score
            this.clearAmountDOM.innerHTML = 0
            this.clearScoreDOM.innerHTML = 0
        }
        bind() {
            EventBus.on(this, 'level', setLevel)
            EventBus.on(this, 'goal', setGoal)
            EventBus.on(this, 'remain', setRemain)
            EventBus.on(this, 'bonus', setBonus)
            EventBus.on(this, 'clear', setClear)
            EventBus.on(this, 'score', setScore)
            EventBus.on(this, 'success', setSuccess)
            EventBus.on(this, 'good', setGood)
            EventBus.on(this, 'better', setBetter)
            EventBus.on(this, 'best', setBest)
            EventBus.on(this, 'record', setRecord)
            var self = this

            function setRecord(r) {
                self.recordDOM.forEach(dom => {
                    dom.innerHTML = r
                })
            }

            function setSuccess() {
                self.success = true
                self.successDOM.classList.toggle('success-show')
                setTimeout(function() {
                    self.successDOM.classList.toggle('success-show')
                }, 1000)
            }

            function setGood() {
                self.goodDOM.classList.toggle('good-show')
                setTimeout(function() {
                    self.goodDOM.classList.toggle('good-show')
                }, 1000)
            }

            function setBetter() {
                self.better = true
                self.betterDOM.classList.toggle('better-show')
                setTimeout(function() {
                    self.betterDOM.classList.toggle('better-show')
                }, 1000)
            }

            function setBest() {
                self.best = true
                self.bestDOM.classList.toggle('best-show')
                setTimeout(function() {
                    self.bestDOM.classList.toggle('best-show')
                }, 1000)
            }

            function setLevel(level) {
                self.levelDOM.innerHTML = level
            }

            function setGoal(goal) {
                self.goalDOM.innerHTML = goal
            }

            function setRemain(remain) {
                self.remainDOM.innerHTML = remain
            }

            function setBonus(bonus) {
                self.bonusDOM.innerHTML = bonus
                self.score += bonus
                self.bonusDOM.parentNode.style.opacity = 1
                setTimeout(function() {
                    self.bonusDOM.parentNode.style.opacity = 0
                }, 1000)
            }

            function setClear(n) {
                var s = n * n * 5
                if (n > 5 && n < 10) {
                    EventBus.emit(self, 'good')
                }
                if (n >= 10 && n < 15) {
                    EventBus.emit(self, 'better')
                }
                if (n >= 15) {
                    EventBus.emit(self, 'best')
                }
                self.clearAmountDOM.innerHTML = n
                self.clearScoreDOM.innerHTML = s
                self.score = self.score + s
                self.clearScoreDOM.parentNode.classList.toggle('clear-show')
                setTimeout(function() {
                    self.clearScoreDOM.parentNode.classList.toggle('clear-show')
                }, 800)
            }

            function setScore(s) {
                self.scoreDOM.innerHTML = s
            }
        }
        get record() {
            return this._record
        }
        set record(r) {
            this._record = r
            EventBus.emit(this, 'record', r)
        }
        get level() {
            return this._level
        }
        set level(lev) {
            this._level = lev
            EventBus.emit(this, 'level', lev)

            if (lev <= 5) {
                this.goal = -1000 + 2000 * lev
            } else if (lev <= 10) {
                this.goal = 9000 + (lev - 5) * 2500
            } else {
                this.goal = 21500 + (lev - 10) * 3000
            }
        }
        get goal() {
            return this._goal
        }
        set goal(g) {
            this._goal = g
            EventBus.emit(this, 'goal', g)
        }
        get remain() {
            return this._remain
        }
        set remain(n) {
            this._remain = n
            var s = 10 - n
            EventBus.emit(this, 'remain', n)
            this.bonus = s > 0 ? 400 * s - 20 * s * s : 0
        }
        get bonus() {
            return this._bonus
        }
        set bonus(b) {
            this._bonus = b
            EventBus.emit(this, 'bonus', b)
        }
        get score() {
            return this._score
        }
        set score(s) {
            this._score = s
            EventBus.emit(this, 'score', s)
            if (this.score >= this.goal && !this.success) {
                EventBus.emit(this, 'success')
            }
        }
    }
    //---------------------------------------------------------------------------------------------
    //视图控制器的类------------------------------------------------------------------------------
    //包含nodes,parent,model,
    class View extends Emitter {
        constructor(model, score, app) {
            super()
            var viewData = app.viewData
            this.parent = document.querySelector(viewData.parent)
            this.gameover = document.querySelector(viewData.gameover)
            this.model = model
            this.score = score
            this.init()
            this.bind()

        }

        init() {
            this.parent.innerHTML = ''
            this.nodes = {}
            this.tappable = true
            var src = this.model.colors
            var xpos = 100 / this.model.x
            var ypos = 100 / this.model.y
            var x = this.model.x,
                y = this.model.y
            var data = this.model.data
            for (var i = 0; i < x; i++) {
                for (var j = 0; j < y; j++) {
                    if (data[i][j] !== null) {
                        var node = document.createElement('span')
                        var etag = i * x + j
                        node.style.left = i * xpos + '%'
                        node.style.bottom = j * ypos + '%'
                        node.style.width = xpos + '%'
                        node.style.height = ypos + '%'
                        node.etag = etag
                        this.nodes[etag] = node
                        node.classList.add(src[data[i][j]])
                        this.parent.appendChild(node)
                    }
                }
            }

        }
        bind() {
            //绑定动画事件----------------------------------------------------------

            EventBus.on(this, 'clear', clearStars)
            EventBus.on(this, 'movedown', movedown)
            EventBus.on(this, 'moveleft', moveleft)
            EventBus.on(this, 'changeModel', changeModel)
            EventBus.on(this, 'levelDone', levelDone)
            EventBus.on(this, 'levelUp', levelUp)
            EventBus.on(this, 'gameover', gameover)
            //---------------------------------------------------------------------
            function getIndex(n, x = 10) {
                var ary = []
                var j = n % x
                var i = (n - j) / x
                ary[0] = i
                ary[1] = j
                return ary
            }

            function getMoveData(data, selects) {
                selects.sort((x, y) => x - y)
                var map = {},
                    left = [],
                    down = {},
                    len = data.length,
                    res = [down, left, map]
                var selectsIndex = selects.map(it => getIndex(it, len))
                for (var val of selectsIndex) {
                    var x = val[0],
                        y = val[1]
                    data[x][y] = null
                    map[x] = map[x] ? map[x] : []
                    map[x].push(y)
                }
                var keys = Object.keys(map)
                for (var key of keys) {
                    var ary = data[key],
                        flag = true
                    var mapValue = map[key]
                    for (var i = 0; i < ary.length; i++) {
                        var sum = 0,
                            value = ary[i]
                        if (value === null) {
                            continue
                        }
                        flag = false
                        for (var val of mapValue) {
                            i > val && sum++
                        }
                        if (sum > 0) {
                            down[+key * len + i] = sum
                        }
                    }
                    if (flag) {
                        left.push(key)
                    }
                }
                return res
            }

            //动画函数------------------------------------------------------
            //消除星星动画--------------------------
            function clearStars(view, n) {
                var selects = view.model.uset.group[view.model.uset.find(n)]
                if (selects.length < 2) {
                    return
                }
                view.tappable = false
                //清除选中元素的动画开始------------------
                selects.forEach(etag => {
                    view.nodes[etag].classList.add('selected')
                })
                setTimeout(function clearSelected() {
                    selects.forEach(etag => {
                        view.parent.removeChild(view.nodes[etag])
                    })

                    var moveData = getMoveData(view.model.data, selects)

                    EventBus.emit(view, 'movedown', view, moveData)
                }, 300)
                EventBus.emit(view.score, 'clear', selects.length)

                //清除选中元素的动画结束-------------------
            }
            //星星向下移动的函数-------------------
            function movedown(view, moveData) {
                var downData = moveData[0]
                for (var key in downData) {
                    var node = view.nodes[key],
                        bottom = node.style.bottom
                    var ypos = 100 / view.model.y
                    bottom = +bottom.substr(0, bottom.length - 1) - ypos * downData[key]
                    node.style.bottom = bottom + '%'
                }
                setTimeout(function() {
                    EventBus.emit(view, 'moveleft', view, moveData)
                }, 200)
            }

            //重建数据的函数---------------------
            function changeModel(view, moveData) {
                var data = view.model.data
                var y = data[0].length
                var map = moveData[2]
                var left = moveData[1]
                left.sort((x, y) => x - y)
                for (var key in map) {
                    if (left.indexOf(key) > -1) {
                        continue
                    }
                    var ary = data[key],
                        len = map[key].length
                    map[key].sort((x, y) => x - y)
                    for (var i = 0; i < len; i++) {
                        ary.splice(map[key][i] - i, 1)
                        ary.push(null)
                    }
                }
                for (var j = 0; j < left.length; j++) {
                    var temp = new Array(y).fill(null)
                    data.splice(left[j] - j, 1)
                    data.push(temp)
                }
                view.parent.innerHTML = ''
                view.model.usetfy()
                view.init()
                if (view.model.uset.allSingle()) {
                    var remain = Object.keys(view.nodes).length
                    view.score.remain = remain
                    view.parent.classList.add('level-done')
                    setTimeout(function() {
                        EventBus.emit(view, 'levelDone', view)
                    })
                }
            }

            function levelUp(view, n) {
                view.score.level = n
                view.score.success = false
                view.model.init()
                view.model.usetfy()
                view.init()
            }

            function gameover(view) {
                view.gameover.classList.add('gameover-show')
                view.score.gameover = true
                view.gameover.querySelector('.game-level').innerHTML = view.score.level
                view.gameover.querySelector('.game-score').innerHTML = view.score.score

            }

            //星星向左移动动画----------------------
            function moveleft(view, moveData) {
                var leftData = moveData[1]
                var x = view.model.data.length
                var map = {}
                if (leftData.length) {
                    for (var i of leftData) {
                        for (var key in view.nodes) {
                            var n = +key % x,
                                m = (+key - n) / x
                            if (m > i && view.model.data[m][n] !== null) {
                                map[key] = map[key] ? map[key] + 1 : 1
                            }
                        }
                    }
                    for (var key in map) {
                        var node = view.nodes[key],
                            left = node.style.left
                        var xpos = 100 / view.model.x
                        left = +left.substr(0, left.length - 1) - xpos * map[key]
                        node.style.left = left + '%'
                    }
                }
                setTimeout(function() {
                    EventBus.emit(view, 'changeModel', view, moveData)
                }, 200)
            }
            //没有可消除的事件---------------------
            function levelDone(view) {
                view.score.levelDone = true
                var nodes = view.nodes
                for (var key in nodes) {
                    var left = nodes[key].style.left
                    left = +left.substr(0, left.length - 1) - 100 + '%'
                    nodes[key].style.left = left
                }
                setTimeout(function() {
                    view.parent.classList.remove('level-done')
                    if (view.score.score >= view.score.goal) {
                        EventBus.emit(view, 'levelUp', view, view.score.level + 1)
                    } else {
                        (view.score.score > view.score.record) && (view.score.record = view.score.score)
                        EventBus.emit(view, 'gameover', view)
                    }

                }, 2000)




            }
            //动画函数结束-------------------------
        }
    }
    //---------------------------------------------------------------------------------------------

    //-------------------游戏的类，new App(data)开启游戏------------------------------------------
    class App {
        constructor(app, useLocal) {
            this.star = new Stars(app, useLocal)
            this.score = new Score(app, useLocal)
            this.view = new View(this.star, this.score, app)
        }
    }
    //--------------------------------------------------------------------------------------------
    //游戏初始化数据
    var game
    var initialLocal = {
        level: 1,
        goal: 1000,
        score: 0,
        isSuccess: false,
        matrix: null,
        record: 0,
        isOver: true
    }
    var localJSON = window.localStorage.getItem('popstar')
    var popstar = JSON.parse(localJSON)
    popstar = popstar ? popstar : initialLocal
    var data = {
        initialScore: {
            record: this.local ? this.local.record : 0,
            level: 1,
            goal: 1000,
            remain: 100,
            bonus: 0,
            score: 0,
            good: '好!',
            better: '太酷!',
            best: '暴走!',
            isSuccess: false,
            levelDOM: '.level-data',
            goalDOM: '.need-data',
            remainDOM: '.remain',
            bonusDOM: '.bonus-mark',
            scoreDOM: '.score',
            clearAmountDOM: '.clear-amount',
            clearScoreDOM: '.add-score',
            successDOM: '.success',
            goodDOM: '.good',
            betterDOM: '.better',
            bestDOM: '.best',
            recordDOM: '.record-text'
        },
        starData: {
            colors: ['blue', 'red', 'green', 'yellow', 'purple'],
            x: 10,
            y: 10,
            matrix: null,
        },
        viewData: {
            parent: '.stars',
            gameover: '.gameover'
        },
        local: JSON.parse(JSON.stringify(popstar))
    }



    function setLocalStorage(view, isOver) {

        popstar.level = view.score.level,
            popstar.goal = view.score.goal,
            popstar.score = view.score.score,
            popstar.isSuccess = view.score.success,
            popstar.record = view.score.record,
            popstar.isOver = isOver,
            popstar.matrix = JSON.parse(JSON.stringify(view.model.data))
        data.local = JSON.parse(JSON.stringify(popstar))

        var json = JSON.stringify(popstar)
        window.localStorage.setItem('popstar', json)
    }

    document.querySelectorAll(data.initialScore.recordDOM).forEach(dom => {
        dom.innerHTML = popstar.record
    })
    var hammertime = new Hammer(document.body)
    hammertime.on('tap', function(e) {
        var restartDOM = [].slice.call(document.querySelectorAll('.newgame'))
        var backDOM = [].slice.call(document.querySelectorAll('.back-home'))
        var menuPage = document.querySelector('.nav-page')
        var gameStart = document.querySelector('.nav-start')
        var gameContinue = document.querySelector('.nav-continue')
        if (game && e.target.parentNode === game.view.parent && game.view.tappable) {
            EventBus.emit(game.view, 'clear', game.view, e.target.etag)
        }
        if (restartDOM.indexOf(e.target) > -1) {
            game.view.gameover.classList.remove('gameover-show')
            game = new App(data, false)
        }
        if (backDOM.indexOf(e.target) > -1) {

            setLocalStorage(game.view, game.view.score.gameover)
            game.view.gameover.classList.remove('gameover-show')
            menuPage.classList.remove('hidden')
            game.view.parent.parentNode.classList.add('hidden')
            game = null
        }
        if (e.target === gameStart) {
            menuPage.classList.add('hidden')
            game = new App(data, false)
            game.view.parent.parentNode.classList.remove('hidden')
        }
        if (e.target === gameContinue) {
            menuPage.classList.add('hidden')
            if (data.local.isOver) {
                game = new App(data, false)
            } else {
                game = new App(data, true)
            }
            game.view.parent.parentNode.classList.remove('hidden')
        }
    })
}
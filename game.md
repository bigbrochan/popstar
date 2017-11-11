#### 一，游戏介绍
PopStar(消灭星星)，是近几年手机端很火的游戏，游戏玩法简单，可玩性强。
    游戏主要规则有：
>  - 点击一颗星星A，如果A和与A相邻的颜色相同的所有的星星组成的区块B中星星个数大于1个，那么整个B区块的所有星星都会消除，消除星星的空白由空白区上方的所有星星下移补齐，如果产生整列的空白，由空白列的右方所有列左移补齐。
    
> - 每次点击清除的星星的个数越多，得分越多；当所有剩下的星星都与它相邻星星颜色不同，那么判定本轮游戏结束，结束时所剩的星星数小于N时，有获得额外奖励得分，剩余越少奖励分越高；最后总得分与本轮（关）所要达到的分数（目标得分）相比较，大于等于，则进入下一轮，小于，则整个游戏结束。
    
> - 游戏关卡从1开始，没过1关，目标得分增加某个数值，个人总得分没过一关都累加，当游戏结束的时候总得分超过得分纪录时会更新纪录。
    
#### 二，游戏设计
根据整个游戏的规则，以及面向对象的设计思路，我把游戏整个骨架分成了3大部分：
> - star部分，也就是游戏的核心数据部分，储存的是整个游戏过程中星星个数和位置的数据。
> - score部分，也就是积分系统，储存的是整个游戏过程中的各种分数的数据 > - view部分，也就是试图控制部分，游戏过程中的动画，star和score数据的变化都由view来控制。

  整个游戏的核心就是实现以上3个部分的Class:Star,Score和View。这个游戏的动画逻辑和数据改变的逻辑相对比较复杂，为了使得逻辑控制变得高校和清晰，我借助了Nodejs的观察订阅模式来设计，简单实现了一个eventEmitter事件发生器，用来绑定事件和触发事件，而Star,Score和View都继承自eventEmitter,同时为了简化操作，设置一个全局的观察者eventBus,方便事件管理。
    
#### 三，整个游戏的逻辑
整个游戏的逻辑大致如下：
    1： 关卡开始，生成star数据，生成score，再生成整个游戏界面，继续
    2：点击星星，如果有没有清除，不触发事件；如果发生清楚，触发清除星星的事件，继续
    3：星星清除完毕，触发清除星星的积分变化事件，触发星星下移填补空白的事件，继续
    4：下移结束，触发左移事件。继续
    5：左移结束，出发star数据重新生成的事件，并判定关卡是否结束。如果结束，判定是否通过关卡，如果通过，则触发level up，进入1循环，如果没通过，出发发 gameover；如果没结束，继续从2开始。

#### 四，核心代码分析
##### 1.并查集的实现
消灭星星游戏最核心的算法有：1.如何判定你点击一个星星时，它周围连续的与它颜色相同的星星有哪些；2.消除了星星以后，哪些星星该怎么移动？3.如何判定没有可消除的星星了？
在解决第一个问题时，通常的做法是用深度优先搜索的算法来判断。而我写这个游戏的缘由就是在学习并查集算法的时候，发现并查集在解决这类大数据中的小集合的查找、操作的情况非常适用，因此在并查集的基础上写了这个游戏。并查集的详细讲解暂不做介绍，以下附上并查集的代码
```javascript
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
```
纪录星星的数据是1个10*10的二维数组，我们只需要按行遍历和按列遍历这个数组，把相邻的两个数字相同的位置合并（union）,就能得到整个二维数组的100位的并查集Uset，并最终压缩，就能从并查集中得到每一个位置的星星所在的集合，任意一个集合的所有星星的位置。
因此在根据数据生成星星的dom时，只要设置每一个星星的dom元素的etag等于这个星星所在的Uset的位置，就能在该星星被点击时，通过e.target.etag找到该星星在维数组的位置，以及Uset中的位置，并从Uset查找的它所在的集合以及集合中其它星星的位置，就可以方便的找到需要清楚的星星有哪些。同时在判定关卡是否结束时，只要判断Uset中是否有集合的个数大于1就行。
以下是详细的代码：
```js
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
```
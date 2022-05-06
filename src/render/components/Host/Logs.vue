<template>
  <div class="host-logs">
    <ul class="top-tab">
      <li :class="type === 'nginx-access' ? 'active' : ''" @click="initType('nginx-access')"
        >Nginx-Access</li
      >
      <li :class="type === 'nginx-error' ? 'active' : ''" @click="initType('nginx-error')"
        >Nginx-Error</li
      >
      <li :class="type === 'apache-access' ? 'active' : ''" @click="initType('apache-access')"
        >Apache-Access</li
      >
      <li :class="type === 'apache-error' ? 'active' : ''" @click="initType('apache-error')"
        >Apache-Error</li
      >
    </ul>
    <el-input v-model="log" resize="none" class="block" :readonly="true" type="textarea"></el-input>
    <div class="tool">
      <el-button class="shrink0" :disabled="!filepath" @click="logDo('open')">打开</el-button>
      <el-button class="shrink0" :disabled="!filepath" @click="logDo('refresh')">刷新</el-button>
      <el-button class="shrink0" :disabled="!filepath" @click="logDo('clean')">清空</el-button>
    </div>
  </div>
</template>

<script>
  import { writeFileAsync, readFileAsync } from '@shared/file.js'
  import { AppMixins } from '@/mixins/AppMixins.js'

  const { existsSync } = require('fs')
  const { exec } = require('child-process-promise')
  const { join } = require('path')
  const { shell } = require('@electron/remote')

  export default {
    name: 'MoHostLogs',
    components: {},
    mixins: [AppMixins],
    props: {},
    data() {
      return {
        type: '',
        name: '',
        filepath: '',
        log: ''
      }
    },
    watch: {},
    created: function () {},
    methods: {
      logDo(flag) {
        switch (flag) {
          case 'open':
            shell.showItemInFolder(this.filepath)
            break
          case 'refresh':
            this.getLog()
            break
          case 'clean':
            writeFileAsync(this.filepath, '')
              .then(() => {
                this.log = ''
                this.$message.success('日志清空成功')
              })
              .catch(() => {
                if (!this.password) {
                  this.$baseEventBus.emit('vue:need-password')
                } else {
                  exec(`echo '${this.password}' | sudo -S chmod 777 ${this.filepath}`)
                    .then(() => {
                      this.logDo('clean')
                    })
                    .catch(() => {
                      this.$baseEventBus.emit('vue:need-password')
                    })
                }
              })
            break
        }
      },
      getLog() {
        if (existsSync(this.filepath)) {
          readFileAsync(this.filepath).then((log) => {
            this.log = log
            this.$nextTick(() => {
              let container = this.$el.querySelector('textarea')
              if (container) {
                container.scrollTop = container.scrollHeight
              }
            })
          })
        } else {
          this.log = '当前无日志'
        }
      },
      initType(type) {
        this.type = type
        this.filepath = this.logfile[type]
        this.getLog()
      },
      init() {
        let logpath = join(global.Server.BaseDir, 'vhost/logs')
        let accesslogng = join(logpath, `${this.name}.log`)
        let errorlogng = join(logpath, `${this.name}.error.log`)
        let accesslogap = join(logpath, `${this.name}-access_log`)
        let errorlogap = join(logpath, `${this.name}-error_log`)
        this.logfile = {
          'nginx-access': accesslogng,
          'nginx-error': errorlogng,
          'apache-access': accesslogap,
          'apache-error': errorlogap
        }
      }
    }
  }
</script>

<style lang="scss">
  .host-logs {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 20px 20px 0 20px;
    background: #1d2033;
    .block {
      display: flex;
      align-items: center;
      flex: 1;
      font-size: 15px;
      textarea {
        height: 100%;
      }
    }
    > .top-tab {
      width: 100%;
      display: flex;
      align-items: center;
      margin-bottom: 20px;
      flex-shrink: 0;
      > li {
        cursor: pointer;
        padding: 0 20px;
        height: 36px;
        margin-right: 20px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        &:hover {
          background-color: #3e4257;
        }
        &.active {
          background: #3e4257;
        }
      }
    }
    .tool {
      flex-shrink: 0;
      width: 100%;
      display: flex;
      align-items: center;
      padding: 30px 0;
      .shrink0 {
        flex-shrink: 0;
      }
      .path {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-right: 20px;
      }
    }
  }
</style>
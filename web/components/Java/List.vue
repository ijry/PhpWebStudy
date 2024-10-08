<template>
  <el-card class="version-manager">
    <template #header>
      <div class="card-header">
        <div class="left">
          <span> JAVA </span>
          <el-popover :show-after="600" placement="top" width="auto">
            <template #default>
              <span>{{ $t('base.customVersionDir') }}</span>
            </template>
            <template #reference>
              <el-button
                class="custom-folder-add-btn"
                :icon="FolderAdd"
                link
                @click.stop="showCustomDir"
              ></el-button>
            </template>
          </el-popover>
        </div>
        <el-button class="button" :disabled="service?.fetching" link @click="resetData">
          <yb-icon
            :svg="import('@/svg/icon_refresh.svg?raw')"
            class="refresh-icon"
            :class="{ 'fa-spin': service?.fetching }"
          ></yb-icon>
        </el-button>
      </div>
    </template>
    <el-table v-loading="service?.fetching" class="service-table" :data="versions">
      <el-table-column prop="version" width="140px">
        <template #header>
          <span style="padding: 2px 12px 2px 24px; display: block">{{ $t('base.version') }}</span>
        </template>
        <template #default="scope">
          <span
            :class="{
              current: checkEnvPath(scope.row)
            }"
            style="padding: 2px 12px 2px 24px; display: block"
            >{{ scope.row.version }}</span
          >
        </template>
      </el-table-column>
      <el-table-column :label="$t('base.path')" :prop="null">
        <template #default="scope">
          <template v-if="!scope.row.version">
            <el-popover popper-class="version-error-tips" width="auto" placement="top">
              <template #reference>
                <span class="path error" @click.stop="openDir(scope.row.path)">{{
                  scope.row.path
                }}</span>
              </template>
              <template #default>
                <span>{{ scope.row?.error ?? $t('base.versionErrorTips') }}</span>
              </template>
            </el-popover>
          </template>
          <template v-else>
            <span
              class="path"
              :class="{
                current: checkEnvPath(scope.row)
              }"
              @click.stop="openDir(scope.row.path)"
              >{{ scope.row.path }}</span
            >
          </template>
        </template>
      </el-table-column>
      <el-table-column :label="$t('base.operation')" :prop="null" width="100px" align="center">
        <template #default="scope">
          <el-popover
            effect="dark"
            popper-class="host-list-poper"
            placement="left-start"
            :show-arrow="false"
            width="auto"
            @before-enter="onPoperShow"
          >
            <ul v-poper-fix class="host-list-menu">
              <li
                v-loading="pathLoading(scope.row)"
                class="path-set"
                :class="pathState(scope.row)"
                @click.stop="pathChange(scope.row)"
              >
                <yb-icon
                  class="current"
                  :svg="import('@/svg/select.svg?raw')"
                  width="17"
                  height="17"
                />
                <span class="ml-15">{{ $t('base.addToPath') }}</span>
              </li>
            </ul>
            <template #reference>
              <el-button link class="status">
                <yb-icon :svg="import('@/svg/more1.svg?raw')" width="22" height="22" />
              </el-button>
            </template>
          </el-popover>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script lang="ts" setup>
  import { ref, computed } from 'vue'
  import { BrewStore, SoftInstalled } from '@web/store/brew'
  import { AsyncComponentShow, waitTime } from '@web/fn'
  import { Service } from '@/components/ServiceManager/service'
  import { FolderAdd } from '@element-plus/icons-vue'

  if (!Service.java) {
    Service.java = {
      fetching: false
    }
  }

  const initing = ref(false)
  const brewStore = BrewStore()

  const onPoperShow = () => {}

  const pathLoading = (item: SoftInstalled) => {
    return false
  }

  const pathState = (item: SoftInstalled) => {
    return 'noset'
  }

  const pathChange = (item: SoftInstalled) => {}

  const checkEnvPath = (item: SoftInstalled) => {}

  const service = computed(() => {
    return Service.java
  })

  const java = computed(() => {
    return brewStore.java
  })
  const versions = computed(() => {
    return brewStore?.java?.installed ?? []
  })

  const init = () => {
    if (initing.value) {
      return
    }
    initing.value = true
    waitTime().then(() => {
      initing.value = false
    })
  }

  const reinit = () => {
    const data = java.value
    data.installedInited = false
    init()
  }

  const resetData = () => {
    if (service?.value?.fetching) {
      return
    }
    service.value.fetching = true
    const data = brewStore.java
    data.installedInited = false
    waitTime().then(() => {
      service.value.fetching = false
    })
  }

  const openDir = (dir: string) => {}

  init()

  let CustomPathVM: any
  import('@web/components/ServiceManager/customPath.vue').then((res) => {
    CustomPathVM = res.default
  })

  const showCustomDir = () => {
    AsyncComponentShow(CustomPathVM, {
      flag: 'java'
    }).then((res) => {
      if (res) {
        console.log('showCustomDir chagned !!!')
        resetData()
      }
    })
  }

  defineExpose({
    reinit
  })
</script>

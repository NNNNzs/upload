
<template>
  <div id="app">
    <n-upload
      action="#"
      multiple
      ref="upload"
      :customRequest="customRequest"
      @mouseenter="handleFocus"
      :disabled="showLoading"
      :file-list-style="{ display: 'none' }"
    >
      <n-button v-if="!showLoading" size="large" type="primary">上传</n-button>
      <NProgress v-else type="circle" :percentage="uploadText"></NProgress>
    </n-upload>
    <n-button @click="listAll" type="primary">完成</n-button>
    <n-button @click="myIndexDB.clearAll" type="primary">清空</n-button>

    <NDrawer v-model:show="showDrawer" :width="500">
      <n-drawer-content title="最近上传" class="drawer-content">
        <NList v-if="rencetUploadList.length > 0" bordered :class="{ done }">
          <NListItem v-for="item in rencetUploadList">
            <p style="cursor:pointer;float:right" @click="handleRemove(item)">X</p>
            <p>
              <span class="title">添加时间:</span>
              <span class="content">
                <NTime :time="item.addTime"></NTime>
              </span>
            </p>
            <p>
              <span class="title">文件名:</span>
              <span class="content">{{ item.fileName }}</span>
            </p>
            <p>
              <span class="title">文件类型:</span>
              <span>{{ item.mime }}</span>
            </p>
            <p>
              <span class="title">链接:</span>
              <span class="content">
                <a target="_blank" :download="item.fileName" :href="item.url">{{ item.url }}</a>
              </span>
            </p>
            <p>
              <span class="title">状态:</span>
              <span class="content">{{ item.status }}</span>
              <span v-if="item.status === '同步中'" class="content" @click="fileExis(item)">检查</span>
            </p>
            <p v-if="item.status === '上传中'">
              <span class="title">进度:</span>
              <span class="content">{{ item.progress }}</span>
            </p>
            <p>
              <span class="title">上传时间:</span>
              <span class="content">
                <NTime :time="item.finishTime"></NTime>
              </span>
            </p>
          </NListItem>
        </NList>
        <NResult v-else status="404" title="404 资源不存在" description="生活总归带点荒谬"></NResult>
      </n-drawer-content>
    </NDrawer>
    <NIcon size="24" @click="showLocal" @mouseenter="showLocal">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        xmlns:xlink="http://www.w3.org/1999/xlink"
        viewBox="0 0 24 24"
      >
        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8l8 8l1.41-1.41L7.83 13H20v-2z" fill="currentColor" />
      </svg>
    </NIcon>
  </div>
</template>,
<script  lang="ts" setup >
import axios, { AxiosResponse } from "axios";
import { defineComponent, ref, Ref, toRef, toRefs, onMounted, reactive, onUnmounted, h } from "vue";
import {
  NButton,
  NUpload,
  NDrawer,
  NTime,
  NDrawerContent,
  NProgress,
  NList,
  NResult,
  NListItem,
  NIcon,
  NSpin,
  UploadCustomRequestOptions,
  useMessage,
  useDialog,
} from "naive-ui";
import RecentUpload, { UploadInfo } from '../hooks/RecentUpload'
import MyIndexDB from '../hooks/IndexDB'

const recentUpload = new RecentUpload();
const rencetUploadList: Ref<UploadInfo[]> = recentUpload.list;
const myIndexDB = new MyIndexDB('upload')

// 每个文件切片大小定为10MB;
const bytesPerPiece: number = 10 * 1024 * 1024;


const showLocal = () => {
  showDrawer.value = !showDrawer.value;
}

const done = ref(false);

const flashCurrent = () => {
  showLocal();
  done.value = true;
  setTimeout(() => {
    done.value = false;
  }, 3000);
}

const msg = useMessage();

// 1. 上传之后 复制上传之后的链接
// 2. 将外链转换成自己的
// 3. 大文件分片上传
// 4. 进度条
// 5. 监听剪贴板粘贴图片可以上传

const base64 = ref<string | null>("");
const imgSrc = ref();
const uploadBlob = ref<Blob>();
const dialog = useDialog();
const hasDialog = ref(false)
const showDrawer = ref(false);
const showLoading = ref(false);
const uploadText = ref<number>(0);

/**
 * 
 * @param text 
 * @description 是否允许外链转换功能
 */
const canTransForm = (text: string) => {
  const imgList = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];
  return text.startsWith('http') && !text.includes('static.nnnnzs.cn') && imgList.some(ext => text.includes(ext))
}

const doCopy = (str: string) => {
  navigator.clipboard.writeText(str).then(() => {
    msg.success('上传成功，成功复制到剪贴板' + str)
    hasDialog.value = false;
    flashCurrent()
  }).catch(() => {
    hasDialog.value = false;
    flashCurrent()
  })
}

const handleFocus = () => {
  navigator.clipboard
    .read()
    .then((clipboardItems) => {
      clipboardItems.forEach((clipboardItem) => {
        for (const type of clipboardItem.types) {

          clipboardItem.getType(type).then((blob) => {
            const isImg = type.includes("image");
            const isText = type.includes('text');
            if (isImg) {
              console.log('isImage', blob);
              const src = URL.createObjectURL(blob);

              imgSrc.value = src;

              if (hasDialog.value) {
                return false
              }

              hasDialog.value = true;

              dialog.info({
                title: '检测到剪贴板有图片，是否上传',
                maskClosable: false,
                content: () => {
                  return h('img', {
                    class: "preview",
                    src: src
                  })
                },
                positiveText: '确定上传',
                negativeText: '不上传',
                onPositiveClick: () => {
                  const addTime = new Date().getTime();
                  handleUpload(blob).then(url => {
                    recentUpload.add({
                      addTime,
                      url,
                      mime: blob.type,
                      origin: "剪贴板",
                      fileName: 'clipboard',
                    });
                    doCopy(url)
                  })
                },
                onClose: () => {
                  hasDialog.value = false;
                },
                onNegativeClick: () => {
                  hasDialog.value = false;
                }
              })


            } else if (isText) {

              navigator.clipboard.readText().then(text => {

                // console.log('isText', text);
                if (canTransForm(text)) {

                  if (hasDialog.value) {
                    return false
                  }

                  hasDialog.value = true;

                  dialog.info({
                    title: '检测到剪贴板有图片外链',
                    maskClosable: false,
                    content: () => {
                      // <div>检测到剪贴板的图片外链<a></a>是否上传<div><img src=""> </div>  </.div>
                      return h('div',
                        [
                          `检测到剪贴板的图片外链`,
                          h('a', {
                            href: text,
                            target: "_blank"
                          }, text),
                          `是否上传？`,
                          h('div',
                            [
                              h('img', {
                                src: text
                              })
                            ]
                          ),
                        ]
                      )
                    },
                    positiveText: '确定上传',
                    negativeText: '不上传',
                    onPositiveClick: () => {
                      transformImage(text).then(res => {
                        doCopy(res)
                      })
                    },
                    onClose: () => {
                      hasDialog.value = false;
                    },
                    onNegativeClick: () => {
                      hasDialog.value = false;
                    }
                  })

                }
              })

            }

          });
        }
      });
    })
    .catch((err) => {
      // 不支持的文件类型
      console.warn("clipboard", err);
    });
};

const hanlePaste = (e: any) => {
  let cbd = e.clipboardData;
  if (!(e.clipboardData && e.clipboardData.items)) {
    return;
  }

  for (var i = 0; i < cbd.items.length; i++) {
    var item = cbd.items[i];
    if (item.kind == "file") {
      var blob = item.getAsFile();
      if (blob.size === 0) {
        return;
      }
      if (blob.type.includes("image")) {
        var reader = new FileReader(); //新建一个FileReader
        reader.readAsDataURL(blob); //读取文件,保存为base64 格式
        reader.onload = function (evt) {
          if (evt.target && typeof evt.target.result === "string") {
            base64.value = evt.target.result;
          }
        };
      }

      handleUpload(blob);
    }
  }
};

const handleRemove = (item: UploadInfo) => {
  recentUpload.remove(item);
}

onMounted(() => {
  window.addEventListener("focus", handleFocus);
  window.addEventListener("paste", hanlePaste);
});

onUnmounted(() => {
  window.removeEventListener("focus", handleFocus);
  window.removeEventListener("paste", hanlePaste);
});

const baseUrl = import.meta.env.DEV ? '/api' : ''

/**
 * 
 * @param blob 
 * @description 通过后端接口上传的cos
 */
const handleUpload = (blob: Blob) => {
  const formData = new FormData();
  formData.append("inputFile", blob);
  return new Promise<string>((resolve, reject) => {
    axios({
      url: baseUrl + "/upload",
      method: "post",
      data: formData,
      onUploadProgress: ({ loaded, total }) => {
        console.log(loaded, total)
      },
    })
      .then(
        (res: AxiosResponse<{ code: number; data: unknown; url: string }>) => {
          const { code, data, url } = res.data;
          if (code == 200) {
            resolve(url);
          } else {
            reject(res);
          }
        }
      )
      .catch((err) => {
        reject(err);
      });
  });
};


const customRequest = ({
  file,
  onFinish,
  onError,
  onProgress,
}: UploadCustomRequestOptions) => {
  const formData = new FormData();
  formData.append("inputFile", file.file as Blob);
  const { name, type } = file;
  if (file.file && file.file.size > bytesPerPiece) {
    splitFile(file.file);
    return false;
  }

  // return false;
  const addTime = new Date().getTime();
  showLoading.value = true;
  axios({
    url: baseUrl + "/upload",
    method: "post",
    data: formData,
    onUploadProgress: ({ loaded, total }) => {
      uploadText.value = Math.ceil((loaded / total) * 100);
      console.log({ percent: Math.ceil((loaded / total) * 100) })
      // onProgress({ percent: Math.ceil((loaded / total) * 100) });
    },
  })
    .then((res) => {
      showLoading.value = false;
      uploadText.value = 0

      const { code, data, url } = res.data;
      if (code == 200) {
        recentUpload.add({
          addTime,
          url,
          mime: type || '',
          origin: '主动上传',
          fileName: name,
        });
        doCopy(url)
        // flashCurrent()

        onFinish();
      }
    })
    .catch((error) => {
      onError();
    });
};


const doUpload = () => {
  const blob = uploadBlob.value;
  if (blob) {
    handleUpload(blob)
      .then((res) => {
        doCopy(res)
      })
      .catch((err) => { });
  }
};

const listAll = () => {
  myIndexDB.listAll(f => {
    console.log(f)
  })
}

interface SaveData {
  addTime: number;
  name: string;
  type: string;
  blob: Blob
}
// 文件切片并且存储到本地
const splitFile = async (file: File) => {
  const { size, name, type } = file;
  // 分片上传
  let index = 0;
  // 总共多少个分片
  const totalPieces = Math.ceil(size / bytesPerPiece);

  console.time(name)
  const wholeSave = async () => {
    const blob = new Blob([file], { type });
    const saveData: SaveData = {
      addTime: new Date().getTime(),
      name,
      type,
      blob,
    }

    await myIndexDB.insert(`${name}`, saveData);
  }

  const spilitSave = async () => {
    while (index < totalPieces) {
      const start = index * bytesPerPiece;
      let end = start + bytesPerPiece;
      if (end > size) {
        end = size
      }
      const chunk = file.slice(start, end);//切割文件
      const chunkName = `${name}.${index}`;
      try {
        await myIndexDB.insert(`${chunkName}`, chunk);
        index++
      } catch (error) {
        throw new Error(JSON.stringify(error))
      }
    }
  }

  wholeSave();

  recentUpload.add({
    addTime: new Date().getTime(),
    url: '',
    mime: type,
    origin: "主动上传",
    fileName: name,
    status: '上传中',
    // progress: `0/${totalPieces}`
  });

  showDrawer.value = true;
  uploadFromIndexDB(name)
}


const uploadFromIndexDB = async (fileName: string) => {
  let mime = ''
  const wholeGet = async () => {
    const obj = await myIndexDB.selectAsync(fileName) as { id: string, value: SaveData }
    const saveData = obj.value;
    const { name, type, blob, addTime } = saveData;
    mime = type
    const file = new File([blob], name, { type });
    const totalPieces = Math.ceil(file.size / bytesPerPiece);
    let index = 0;

    while (index < totalPieces) {
      const start = index * bytesPerPiece;
      let end = start + bytesPerPiece;
      if (end > file.size) {
        end = file.size
      }
      const chunk = file.slice(start, end);//切割文件
      const chunkName = `${fileName}.${index}`;
      const formData = new FormData();
      formData.append("chunk", chunk)
      formData.append("fileName", fileName)
      formData.append("chunkName", chunkName);

      await axios({
        url: baseUrl + "/uploadChunk",
        method: "post",
        data: formData
      });

      recentUpload.editItem(fileName, {
        addTime: addTime,
        mime: type,
        fileName: fileName,
        url: '暂无',
        status: '上传中',
        finishTime: new Date().getTime(),
        origin: '主动上传',
        progress: `${++index}/${totalPieces}`
      })
    }
    myIndexDB.del(fileName);
  }

  const splitGet = async () => {
    const file = recentUpload.getItem(fileName);
    if (!file) return;
    let progress: string = file.progress as string;
    let [current, total] = progress.split('/').map(e => Number(e))
    mime = file.mime
    while (current < total) {
      const chunkName = `${fileName}.${current}`;

      const obj = await myIndexDB.selectAsync(chunkName) as { id: string, value: Blob }
      const chunk = obj.value;
      const formData = new FormData();
      formData.append("chunk", chunk)
      formData.append("fileName", fileName)
      formData.append("chunkName", chunkName);

      await axios({
        url: baseUrl + "/uploadChunk",
        method: "post",
        data: formData
      });

      recentUpload.editItem(fileName, {
        addTime: file.addTime,
        mime: file.mime,
        fileName: fileName,
        url: '暂无',
        status: '上传中',
        finishTime: new Date().getTime(),
        origin: '主动上传',
        progress: `${++current}/${total}`
      })
      myIndexDB.del(chunkName)
    }
  }

  await wholeGet()

  axios({
    url: baseUrl + "/joinChunk",
    method: 'post',
    data: { fileName }
  }).then(res => {
    recentUpload.editItem(fileName, {
      addTime: new Date().getTime(),
      mime: mime,
      fileName: fileName,
      url: res.data.url,
      finishTime: new Date().getTime(),
      status: '上传成功',
      origin: '主动上传',
    })
    msg.success(res.data.msg);
    // console.log('joinChunk', res.data)
  })

  console.log('上传完成')
}


/**
 * 
 * @param url url
 * @description 图片转换，通过后端下载图片，上传到cos，再返回给前端
 */
const transformImage = (url: string) => {
  return new Promise<string>(resolve => {
    axios({
      url: baseUrl + '/dupload',
      method: "post",
      data: {
        url,
      }
    }).then(res => {
      if (res.data) {
        resolve(res.data.url)
      }
    })
  })
}

const fileExis = (item: UploadInfo) => {
  axios({
    url: baseUrl + '/isExis',
    method: 'get',
    params: { url: item.url }
  }).then(res => {
    if (res.data.data) {
      item.status = "上传成功";
    }
  })
}

</script>

<style lang="less">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
body {
  background-color: #efefef;
  width: 100vw;
  height: 100vh;
}
.n-dialog.n-modal {
  width: auto;
  min-width: 446px;
}
.preview {
  border: 1px dashed #bf6464;
  padding: 5px;
}
.drawer-content {
  .title {
    width: 30px;
    position: relative;
    margin-right: 2px;
  }
  .content {
    word-break: break-all;
  }
}
@keyframes flash {
  from {
    border: 1px solid blue;
  }
  to {
    border: 1px solid gold;
  }
}

.done .n-list-item:first-of-type {
  animation: flash 1s infinite;
}
</style>

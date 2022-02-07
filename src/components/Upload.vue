
<template>
  <div id="app">
    <n-upload
      action="#"
      multiple
      ref="upload"
      :customRequest="customRequest"
      @mouseenter="handleFocus"
    >
      <n-button size="large" type="primary">上传文件</n-button>
    </n-upload>
  </div>
</template>

<script  lang="ts" setup >
import axios, { AxiosResponse } from "axios";
import { defineComponent, ref, onMounted, reactive, onUnmounted, h } from "vue";
import {
  NButton,
  NUpload,
  UploadCustomRequestOptions,
  useMessage,
  useDialog,
} from "naive-ui";


const msg = useMessage();
// 1. 上传之后 复制上传之后的链接
// 2. 将外链转换成自己的
// 3. 大文件分片上传
// 4. 进度条
// 5. 监听剪贴板粘贴图片可以上传

const base64 = ref<string | null>("");
const imgSrc = ref();
const showModal = ref(false);
const uploadBlob = ref<Blob>();
const dialog = useDialog();
const hasDialog = ref(false)

const canTransForm = (text: string) => {
  const imgList = ['.png', '.jpg', '.jpeg', '.webp','.gif','.svg'];
  return text.startsWith('http') && !text.includes('static.nnnnzs.cn') && imgList.some(ext => text.includes(ext))
}

const doCopy = (str: string) => {
  navigator.clipboard.writeText(str).then(() => {
    msg.success('上传成功，成功复制到剪贴板' + str)
    hasDialog.value = false;
  });
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
              console.log('isImage');
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
                  handleUpload(blob).then(url => {
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

                console.log('isText', text);
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

  axios({
    url: baseUrl + "/upload",
    method: "post",
    data: formData,
    onUploadProgress: ({ loaded, total }) => {
      onProgress({ percent: Math.ceil((loaded / total) * 100) });
    },
  })
    .then((res) => {
      const { code, data, url } = res.data;
      if (code == 200) {
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
</style>

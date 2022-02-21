import { ref, watch, Ref } from "vue";
interface Opt {
  max: number
}
type originType = "剪贴板" | "主动上传"
export interface UploadInfo {
  addTime: number | Date
  finishTime: number | Date
  fileName: string
  url: string,
  mime: string,
  origin: originType
}


export default class RecentUpload {
  private localKey: string
  private opt: Opt
  // private request: IDBOpenDBRequest
  public list: Ref<Array<UploadInfo>>
  constructor(key = "_rencet", opt = { max: 10 }) {
    this.localKey = key
    this.opt = opt;
    const localList: Array<UploadInfo> = this.getList();
    this.list = ref(localList);

    // this.request = window.indexedDB.open(key)
    // this.request.onerror = function (event) {
    //   console.log(' 打开数据库报错');
    // };

    // this.request.onupgradeneeded = function (event) {
    //   const db = event.target.result;
    //   var objectStore = null;
    //   if (!db.objectStoreNames.contains(key)) {
    //     objectStore = db.createObjectStore(key, { keyPath: 'id' });
    //     // unique name可能会重复
    //     objectStore.createIndex('addTime', 'addTime', { unique: true });
    //   }
    // }

    watch(this.list.value, (newVal) => {
      localStorage.setItem(this.localKey, JSON.stringify(newVal))
    })

  }

  getList() {
    const localData = localStorage.getItem(this.localKey)
    if (localData) {
      return JSON.parse(localData)
    } else {
      return []
    }
  }

  add(item: Omit<UploadInfo, "finishTime">) {
    const list = this.list.value;
    if (list.length > this.opt.max) {
      list.pop()
    }
    const uploadInfo: UploadInfo = {
      ...item,
      finishTime: new Date().getTime()
    }
    list.unshift(uploadInfo);
  }
  remove(item: UploadInfo) {
    const index = this.list.value.findIndex(e => e === item)
    this.list.value.splice(index, 1)

  }
}
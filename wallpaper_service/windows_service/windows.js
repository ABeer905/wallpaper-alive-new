const { Worker, isMainThread, parentPort } = require('node:worker_threads');
const windows_cc = require("./../build/Release/windows_service")

if(isMainThread){
    const os = require("os")
    var worker;
    
    exports.setWallpaper = (handle, x, y) => {
        const hwnd = os.endianness() == "LE" ? handle.readInt32LE() : handle.readInt32BE()
        windows_cc.setWallpaper(hwnd, x, y)
    }
    
    exports.onAppStateChange = (func) => {
        worker = new Worker(__filename);
        worker.on('message', (message) => func(message))
    }

    exports.initializeAudioMonitor = () => windows_cc.initializeAudioMonitor()
    exports.isAudioPlaying = () => windows_cc.isSystemAudioPlaying()
    exports.quit = () => worker.terminate()
}else{
    windows_cc.onAppStateChange((data) => parentPort.postMessage(data))
}
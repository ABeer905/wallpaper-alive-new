{
  "targets": [
    {
      "target_name": "windows_service",
      "sources": [ "windows_service/windows_service.cc" ],
      "include_dirs": ["<!@(node -p \"require('node-addon-api').include\")"],
      "dependencies": ["<!(node -p \"require('node-addon-api').gyp\")"],
      'msvs_settings': {
          'VCCLCompilerTool': {
            'ExceptionHandling': '1'
          }
      }
    }
  ]
}
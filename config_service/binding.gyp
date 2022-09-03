{
  "targets": [
    {
      "target_name": "steam_service",
      "sources": ["steam_service/steam_service.cc"],
			"libraries": ["<(module_root_dir)/steam_service/steam_sdk/steam_api64.lib"],
      "copies": [
        {
          "destination": "<(module_root_dir)/build/Release/",
          "files": ["<(module_root_dir)/steam_service/steam_sdk/steam_api64.dll"]
        },
      ],
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
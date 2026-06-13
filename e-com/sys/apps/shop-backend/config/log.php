<?php
return [
    'default' => 'file',
    'channels' => [
        'file' => [
            'type'        => 'File',
            'path'        => '',
            'apart_level' => [],
            'max_files'   => 0,
            'json'        => false,
            'close'       => false,
            'format'      => '[%s][%s] %s',
            'single'      => false,
        ],
    ],
];

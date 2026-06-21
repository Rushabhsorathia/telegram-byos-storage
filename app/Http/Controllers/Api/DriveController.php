<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFolderRequest;
use App\Http\Requests\UpdateFileMetaRequest;
use App\Http\Requests\UpdateFolderRequest;
use App\Jobs\DeleteRemoteChunksJob;
use App\Models\File;
use App\Models\Folder;
use Illuminate\Http\Request;

class DriveController extends Controller
{
    /**
     * Browse the drive: returns folders + files for a given view/folder,
     * plus the breadcrumb path to the current folder.
     *
     * Query: ?view=my|starred|recent|trash  &  ?folder=<id|root>
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $view = $request->query('view', 'my');
        $folderId = $this->resolveFolderId($request->query('folder', 'root'));

        $folderQuery = Folder::where('user_id', $user->id)->whereNull('trashed_at');
        $fileQuery = File::where('user_id', $user->id);

        $breadcrumbs = [];
        $activeFolder = null;

        switch ($view) {
            case 'starred':
                $folders = collect();
                $files = (clone $fileQuery)->where('starred', true)->whereNull('trashed_at')->latest()->get();
                break;

            case 'recent':
                $folders = collect();
                $files = (clone $fileQuery)->whereNull('trashed_at')->latest()->limit(50)->get();
                break;

            case 'trash':
                $folders = Folder::where('user_id', $user->id)
                    ->whereNotNull('trashed_at')->latest('trashed_at')->get();
                $files = (clone $fileQuery)->whereNotNull('trashed_at')->latest('trashed_at')->get();
                break;

            default: // my drive — contents of the selected folder
                $folders = (clone $folderQuery)->where('parent_id', $folderId)->orderBy('name')->get();
                $files = (clone $fileQuery)->whereNull('trashed_at')->where('folder_id', $folderId)->latest()->get();
                $breadcrumbs = $this->breadcrumbs($user->id, $folderId);
                $activeFolder = $folderId ? Folder::find($folderId) : null;
                break;
        }

        return response()->json([
            'view' => $view,
            'folder' => $activeFolder,
            'breadcrumbs' => $breadcrumbs,
            'folders' => $folders,
            'files' => $files,
        ]);
    }

    public function storeFolder(StoreFolderRequest $request)
    {
        $data = $request->validated();
        $data['user_id'] = $request->user()->id;
        $data['parent_id'] = $this->resolveFolderId($data['parent_id'] ?? 'root');

        $folder = Folder::create($data);

        return response()->json(['folder' => $folder], 201);
    }

    public function updateFolder(UpdateFolderRequest $request, Folder $folder)
    {
        abort_unless($folder->user_id == $request->user()->id, 403);

        $data = $request->validated();
        if (array_key_exists('parent_id', $data)) {
            $data['parent_id'] = $this->resolveFolderId($data['parent_id']);
        }
        if (array_key_exists('trashed', $data)) {
            $data['trashed_at'] = $data['trashed'] ? now() : null;
            unset($data['trashed']);
        }

        $folder->update($data);

        return response()->json(['folder' => $folder->fresh()]);
    }

    public function destroyFolder(Request $request, Folder $folder)
    {
        abort_unless($folder->user_id == $request->user()->id, 403);

        // Permanent delete — also wipes files inside (cascade) and remote chunks.
        foreach ($folder->files()->get() as $file) {
            $this->purgeFile($file);
        }
        $folder->forceDelete();

        return response()->json(['message' => 'Folder deleted permanently']);
    }

    public function updateFile(UpdateFileMetaRequest $request, File $file)
    {
        abort_unless($file->user_id == $request->user()->id, 403);

        $data = $request->validated();
        if (array_key_exists('folder_id', $data)) {
            $data['folder_id'] = $this->resolveFolderId($data['folder_id']);
        }
        if (array_key_exists('trashed', $data)) {
            $data['trashed_at'] = $data['trashed'] ? now() : null;
            unset($data['trashed']);
        }

        $file->update($data);

        return response()->json(['file' => $file->fresh()]);
    }

    private function resolveFolderId(mixed $value): ?int
    {
        if ($value === null || $value === '' || $value === 'root') {
            return null;
        }

        return (int) $value;
    }

    private function breadcrumbs(int $userId, ?int $folderId): array
    {
        $chain = [];
        $current = $folderId ? Folder::where('user_id', $userId)->find($folderId) : null;

        while ($current) {
            array_unshift($chain, [
                'id' => $current->id,
                'name' => $current->name,
            ]);
            $current = $current->parent;
        }

        return $chain;
    }

    private function purgeFile(File $file): void
    {
        if (in_array($file->status, ['complete', 'failed', 'processing'])) {
            DeleteRemoteChunksJob::dispatch($file->id);
        }
        $file->forceDelete();
    }
}

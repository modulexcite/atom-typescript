import atomUtils = require("./atomUtils");

///ts:import=atomConfig
import atomConfig = require('./atomConfig'); ///ts:import:generated

///ts:import=parent
import parent = require('../../worker/parent'); ///ts:import:generated

import {errorView, show, panelView, getFileStatus} from "./views/mainPanelView";

///ts:import=debugAtomTs
import debugAtomTs = require('./debugAtomTs'); ///ts:import:generated

export function handle(event: { filePath: string; editor: AtomCore.IEditor }) {
    // As a fall back to make sure we sync up in case of anything bad happening elsewhere.
    var textUpdated = parent.updateText({ filePath: event.filePath, text: event.editor.getText() });

    // Refresh errors for file
    textUpdated.then(() => {
        // also invalidate linter
        atomUtils.triggerLinter();

        parent.errorsForFile({ filePath: event.filePath })
            .then((resp) => errorView.setErrors(event.filePath, resp.errors));
    })

    show();

    // Compile on save
    parent.getProjectFileDetails({ filePath: event.filePath }).then(fileDetails => {
        if (!fileDetails.project.compileOnSave) return;
        if (fileDetails.project.compilerOptions.out) return;

        textUpdated.then(() => parent.emitFile({ filePath: event.filePath }))
            .then((res) => {
                let status = getFileStatus(event.filePath);
                status.saved = true;

                // If there was a compilation error, the file differs from the one on the disk
                status.modified = res.emitError;
                panelView.updateFileStatus(event.filePath);
                errorView.showEmittedMessage(res);
            });
    });
}

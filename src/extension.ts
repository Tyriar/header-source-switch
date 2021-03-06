// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
var fileExists = require('file-exists');

let headerExtensions : String[] = ['.h', '.hpp', '.hh', '.hxx'];
let sourceExtensions : String[] = ['.cpp', '.c', '.cc', '.cxx', '.m', '.mm'];

function openFile(fileName:string) {

    console.log("Opening " + fileName);

    let openEditor = vscode.window.visibleTextEditors.find(editor => {
        let editorName = editor.document.fileName;
        return editorName == fileName;
    });

    if (openEditor != undefined)
    {
        vscode.window.showTextDocument(openEditor.document);
    }
    else
    {
        let uriFile = vscode.Uri.file(fileName);
        let work = vscode.workspace.openTextDocument(uriFile);
        work.then(
            document => {
                console.log("Done opening " + document.fileName);
                vscode.window.showTextDocument(document);
            }
        ).then(() => {return;}, (error) => { console.error(error); }) ;
    }
}

function openFileInRightPane(fileName:string) {
    console.log("Opening " + fileName + " in right pane");

    let uriFile = vscode.Uri.file(fileName);
    let work = vscode.workspace.openTextDocument(uriFile);
    work.then(
        document => {
            console.log("Done opening " + document.fileName);
            vscode.window.showTextDocument(document, vscode.ViewColumn.Two);
        }
    ).then(() => {return;}, (error) => { console.error(error); }) ;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    var disposable = vscode.commands.registerCommand('extension.switch', async () => {
        getHeaderSourceAsync().then(
            (filename:string) =>
            {
                if (filename != null)
                {
                    openFile(filename);
                }
            }
        );
    });

    context.subscriptions.push(disposable);

    var switchNewPaneDisposable = vscode.commands.registerCommand('extension.switchRightPane', async () => {
        getHeaderSourceAsync().then(
            (filename:string) =>
            {
                if (filename != null)
                {
                    openFileInRightPane(filename);
                }
            }
        );
    });

    context.subscriptions.push(switchNewPaneDisposable);
}

function getHeaderSourceAsync() : Thenable<string>
{
    let editor = vscode.window.activeTextEditor;
    let document = editor.document.fileName;
    let dir = path.dirname(document);
    let extension = path.extname(document);
    let fileWithoutExtension = path.basename(document).replace(extension, '');

    if (extension.length == 0)
    {
        // Do nothing if there is no extension
        return;
    }



    // Determine if the file is a header or source file.
    let extensions : String[];

    if (headerExtensions.indexOf(extension) != -1) {
        extensions = sourceExtensions;
    }
    else
    {
        extensions = headerExtensions;
    }

    let extRegex = "(\\" + extensions.join("|\\") + ")$";
    let newFileName = fileWithoutExtension;
    let found : boolean = false;

    // Search the current directory for a matching file
    let filesInDir: String[] = fs.readdirSync(dir).filter((value: string, index: number, array: string[]) =>
    {
        return (path.extname(value).match(extRegex) != undefined);
    });

    for (var i = 0; i < filesInDir.length; i++)
    {
        let fileName: String = filesInDir[i];
        let match = fileName.match(fileWithoutExtension + extRegex);
        if (match)
        {
            found = true;
            newFileName = match[0];
            break;
        }
    }

    if (found)
    {
        let newFile = path.join(dir, newFileName);
        return new Promise<string>((resolve, reject) => {
            resolve(newFile);
        });
    }
    else
    {
        return new Promise<string>((resolve, reject) =>
        {
            let promises = new Array<Promise<vscode.Uri[]>>();
            extensions.forEach(ext => {
                promises.push(new Promise<vscode.Uri[]>(
                    (resolve, reject) =>
                    {
                        vscode.workspace.findFiles('**/'+fileWithoutExtension+ext, '', 1).then(
                            (uris) =>
                            {
                                resolve(uris);
                            }
                        );
                    }));
            });

            Promise.all(promises).then(
                (values:any[]) => {
                    let resolved = false;
                    values.forEach(p => {
                       if (p.length > 0)
                       {
                           resolved = true;
                           resolve(path.normalize(p[0].fsPath));
                       }
                    });

                    if (!resolved)
                    {
                        resolve(null);
                    }
                }
            );
        });
    }
}
using Microsoft.Win32;
using System;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Security.Principal;
using System.Windows.Forms;

namespace SaadStudioInstaller
{
    internal static class Program
    {
        [STAThread]
        private static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm());
        }
    }

    internal sealed class InstallerForm : Form
    {
        private readonly TextBox logBox;
        private readonly Button installButton;
        private readonly Button closeButton;

        public InstallerForm()
        {
            Text = "Saad Studio Setup";
            Width = 620;
            Height = 420;
            StartPosition = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;

            var title = new Label
            {
                Text = "Saad Studio Extension Installer",
                Font = new Font(FontFamily.GenericSansSerif, 14, FontStyle.Bold),
                AutoSize = true,
                Left = 18,
                Top = 18
            };

            var subtitle = new Label
            {
                Text = "Installs the Adobe CEP extension and enables PlayerDebugMode for this Windows user.",
                AutoSize = true,
                Left = 18,
                Top = 50
            };

            logBox = new TextBox
            {
                Left = 18,
                Top = 82,
                Width = 566,
                Height = 240,
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Vertical
            };

            installButton = new Button
            {
                Text = "Install / Update",
                Left = 348,
                Top = 336,
                Width = 112,
                Height = 32
            };
            installButton.Click += delegate { Install(); };

            closeButton = new Button
            {
                Text = "Close",
                Left = 472,
                Top = 336,
                Width = 112,
                Height = 32
            };
            closeButton.Click += delegate { Close(); };

            Controls.Add(title);
            Controls.Add(subtitle);
            Controls.Add(logBox);
            Controls.Add(installButton);
            Controls.Add(closeButton);
        }

        private void Install()
        {
            installButton.Enabled = false;
            try
            {
                Log("Starting Saad Studio installation...");
                EnablePlayerDebugMode();

                var targetRoot = GetTargetRoot();
                var extensionDir = Path.Combine(targetRoot, "app.saadstudio.cep");
                Log("Target: " + extensionDir);

                var tempRoot = Path.Combine(Path.GetTempPath(), "SaadStudioInstaller-" + Guid.NewGuid().ToString("N"));
                Directory.CreateDirectory(tempRoot);

                try
                {
                    ExtractPayload(tempRoot);
                    if (Directory.Exists(extensionDir))
                    {
                        Log("Removing old extension folder...");
                        Directory.Delete(extensionDir, true);
                    }

                    Directory.CreateDirectory(extensionDir);
                    CopyDirectory(tempRoot, extensionDir);
                }
                finally
                {
                    try { if (Directory.Exists(tempRoot)) Directory.Delete(tempRoot, true); } catch { }
                }

                Log("");
                Log("SUCCESS: Saad Studio is installed.");
                Log("Restart Premiere Pro, then open Window > Extensions > Saad Studio.");
                MessageBox.Show(this, "Saad Studio installed successfully.\nRestart Premiere Pro before opening the panel.", "Saad Studio Setup", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                Log("");
                Log("ERROR: " + ex.Message);
                MessageBox.Show(this, ex.Message, "Saad Studio Setup Failed", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                installButton.Enabled = true;
            }
        }

        private static string GetTargetRoot()
        {
            if (IsAdministrator())
            {
                return Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
                    "Common Files",
                    "Adobe",
                    "CEP",
                    "extensions");
            }

            return Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "Adobe",
                "CEP",
                "extensions");
        }

        private static bool IsAdministrator()
        {
            using (var identity = WindowsIdentity.GetCurrent())
            {
                var principal = new WindowsPrincipal(identity);
                return principal.IsInRole(WindowsBuiltInRole.Administrator);
            }
        }

        private void EnablePlayerDebugMode()
        {
            Log("Enabling Adobe CEP PlayerDebugMode...");
            for (var version = 8; version <= 16; version++)
            {
                using (var key = Registry.CurrentUser.CreateSubKey(@"Software\Adobe\CSXS." + version))
                {
                    if (key != null) key.SetValue("PlayerDebugMode", "1", RegistryValueKind.String);
                }
            }
        }

        private void ExtractPayload(string destination)
        {
            Log("Extracting extension payload...");
            var assembly = Assembly.GetExecutingAssembly();
            using (var stream = assembly.GetManifestResourceStream("SaadStudioInstaller.payload.zip"))
            {
                if (stream == null) throw new InvalidOperationException("Embedded payload was not found.");
                using (var archive = new ZipArchive(stream, ZipArchiveMode.Read))
                {
                    archive.ExtractToDirectory(destination);
                }
            }
        }

        private static void CopyDirectory(string source, string destination)
        {
            foreach (var dir in Directory.GetDirectories(source, "*", SearchOption.AllDirectories))
            {
                Directory.CreateDirectory(dir.Replace(source, destination));
            }

            foreach (var file in Directory.GetFiles(source, "*", SearchOption.AllDirectories))
            {
                var target = file.Replace(source, destination);
                Directory.CreateDirectory(Path.GetDirectoryName(target));
                File.Copy(file, target, true);
            }
        }

        private void Log(string message)
        {
            logBox.AppendText(message + Environment.NewLine);
        }
    }
}

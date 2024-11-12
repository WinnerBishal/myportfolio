import os
import sys
import nbconvert
import nbformat
from traitlets.config import Config

def convert_and_append(notebook_path, markdown_file):
    """
    Convert notebook to markdown and append to existing markdown file
    """
    try:
        # Read the notebook
        with open(notebook_path, 'r', encoding='utf-8') as f:
            notebook = nbformat.read(f, as_version=4)
        
        # Configure the exporter
        c = Config()
        c.MarkdownExporter.exclude_input_prompt = True
        c.MarkdownExporter.exclude_output_prompt = True
        # Add LaTeX support
        c.MarkdownExporter.template_file = 'markdown'
        c.MarkdownExporter.anchor_link_text = ''  # Remove anchor links
        
        markdown_exporter = nbconvert.MarkdownExporter(config=c)
        
        # Convert notebook to markdown
        markdown, resources = markdown_exporter.from_notebook_node(notebook)
        
        # Handle images
        if resources and 'outputs' in resources:
            # Create images directory if it doesn't exist
            img_dir = os.path.join(os.path.dirname(markdown_file), 'assets', 'images')
            os.makedirs(img_dir, exist_ok=True)
            
            # Save all images and update markdown references
            for filename, data in resources['outputs'].items():
                img_path = os.path.join(img_dir, filename)
                with open(img_path, 'wb') as f:
                    f.write(data)
                # Update image paths in markdown
                markdown = markdown.replace(filename, f'/assets/images/{filename}')
        
        # Read existing markdown file
        with open(markdown_file, 'r', encoding='utf-8') as f:
            existing_content = f.read()
        
        # Append converted content to the markdown file
        with open(markdown_file, 'w', encoding='utf-8') as f:
            f.write(existing_content)
            f.write("\n\n<!-- Notebook Content -->\n\n")
            # Ensure LaTeX is properly wrapped
            markdown = markdown.replace('$$', '\n$$\n')  # Add newlines around LaTeX blocks
            f.write(markdown)
        
        print(f"✓ Successfully appended notebook content to {markdown_file}")
        
    except Exception as e:
        print(f"✗ Error processing notebook: {str(e)}")

def main():
    if len(sys.argv) != 3:
        print("Usage: python convert.py path/to/notebook.ipynb path/to/project.md")
        sys.exit(1)
    
    notebook_path = sys.argv[1]
    markdown_file = sys.argv[2]
    
    if not os.path.exists(notebook_path):
        print(f"Notebook file not found: {notebook_path}")
        sys.exit(1)
    
    if not os.path.exists(markdown_file):
        print(f"Markdown file not found: {markdown_file}")
        sys.exit(1)
    
    convert_and_append(notebook_path, markdown_file)

if __name__ == '__main__':
    main()

"""
    Scrapes NEU course information.
"""

import json
import itertools
import os
import re
import sys
import threading
import traceback
import urllib
import urllib2

import lxml.html


# Regex for extracting course number from title
TITLE_INFO_REGEX = re.compile('.*([0-9]{4}).*-(.*)')
# Base URL for the course display page
DISPLAY_COURSES_URL = 'https://wl11gp.neu.edu/udcprod8/bwckctlg.p_display_courses?'
# Default parameters for the course display page
DEFAULT_COURSES_PARAMS = {
    "sel_levl": "dummy", 
    "call_proc_in": "", 
    "sel_to_cred": "", 
    "sel_crse_strt": "", 
    "sel_from_cred": "", 
    "sel_divs": "dummy", 
    "sel_schd": "dummy", 
    "sel_attr": "dummy", 
    "term_in": "201410", 
    "sel_coll": "dummy", 
    "sel_dept": "", 
    "sel_crse_end": "", 
    "sel_title": ""
}

def get_dom(url, data=None):
    """
        Performs an HTTP request on the url and returns an LXML DOM of the HTML
        response.
    """
    response = urllib2.urlopen(url, data=data)
    try:
        return lxml.html.parse(response).getroot()
    finally:
        response.close()

def get_course_page(department):
    """
        Gets the courses list for the given department
    """
    params = DEFAULT_COURSES_PARAMS.copy()
    params["sel_subj"] = department
    # For some reason, sel_sub is required twice.
    url = DISPLAY_COURSES_URL + 'sel_subj=dummy&' + urllib.urlencode(params)
    return get_dom(url)

def get_departments():
    """
        Returns a list of department strings
    """
    # XXX: Do this by scraping.
    print 'Getting departments (fake)'
    curdir = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(curdir, 'department_list.json'), 'r') as fobj:
        return json.load(fobj)

def elems_to_content(elems):
    """
        Takes a list of LXML elements and returns a list of their text content 
    """
    return [elem.text_content() for elem in elems]

def parse_hours(text):
    """
        Parses a course hours or lecture hours string into a dict
    """
    parts = text.split()
    if len(parts) == 1:
        return {
            'type': 'single',
            'value': float(parts[0])
        }
    elif len(parts) == 3 and parts[1] == 'TO':
        return {
            'type': 'range',
            'min': float(parts[0]),
            'max': float(parts[2])
        }
    elif len(parts) == 3 and parts[1] == 'OR':
        return {
            'type': 'options',
            'options': [float(parts[0]), float(parts[2])]
        }

def iter_child_textnodes(elem, strip_whitespace=False, remove_empty=False):
    """
        Returns a generator which produces a list of the text contents of direct
        child nodes.
    """
    # Text nodes found after the first HTML child of this element are stored
    # in the tail properties of the child elements rather than in the list of
    # children.
    tail_iter = (c.tail for c in elem.iterchildren() if c.tail is not None)
    chained_iter = itertools.chain((elem.text,), tail_iter)
    if strip_whitespace:
        chained_iter = (s.strip() for s in chained_iter)
    if remove_empty:
        chained_iter = (s for s in chained_iter if s)
    return chained_iter

def splitstrip(text, separator):
    """
        Splits text on a separator, then strips white space from the resulting
        strings and only outputs non-empty strings.
    """
    return [t.strip() for t in text.split(separator) if t.strip()]

def parse_description(description):
    """
        Parses a description element into a dictionary
    """
    info = {}
    try:
        info['prereqstr'] = description.cssselect('i')[0].text_content()
    except IndexError:
        info['prereqstr'] = None
    text_parts_iter = iter_child_textnodes(description, True, True)
    # Get the actual description string. (Ends before line with credit hours)
    desc_parts = []
    for part in text_parts_iter:
        if 'Credit hours' in part:
            break
        desc_parts.append(part)
    info['description'] = ' '.join(desc_parts)
    # Extract the credit and lecture hours
    for part in text_parts_iter:
        part = part.strip()
        if 'Credit hours' in part:
            info['creditHours'] = parse_hours(part.partition('Credit')[0])
        elif 'Lecture hours' in part:
            info['lectureHours'] = parse_hours(part.partition('Lecture')[0])
    # Get the fieldlabeltext labled parameters using DOM siblings
    for elem in description.cssselect('.fieldlabeltext'):
        elemtext = elem.text.strip()
        if elemtext == 'Levels:':
            info['levels'] = splitstrip(elem.tail, ',')
        elif elemtext == 'Schedule Types:':        
            info['scheduleTypes'] = splitstrip(elem.getnext().text or '', ',')
        elif elemtext == 'Course Attributes:':
            info['attributes'] = splitstrip(elem.getnext().tail, ',')
    return info

def get_course_info(dept):
    """
        Takes a department and returns a dictionary mapping course numbers to
        dicts containing their information
    """
    dom = get_course_page(dept)
    titles = elems_to_content(dom.cssselect('td.nttitle'))
    descriptions = dom.cssselect('td.ntdefault')[:len(titles)]
    course_array = []
    for title, description in zip(titles, descriptions):
        course_num, title = TITLE_INFO_REGEX.match(title).groups()
        course_num = int(course_num)
        title = title.strip()
        info = parse_description(description)
        info['title'] = title
        course_dict = {}
        course_dict[course_num] = info
        course_array.append(course_dict)
    return course_array

def get_course_info_by_dept(depts, threadcount=10):
    """
        Gets a dictionary mapping departments to their course information
    """
    # Lock for department queue
    dlock = threading.Lock()
    output = {}
    depts = itertools.tee(depts, 1)[0]
    errors = []
    def threadfunc():
        """
            Runs inside of the threads. Gets information for departments in
            a loop and returns when no deparments remain in the queue
        """
        while True:
            try:
                dlock.acquire()
                try:
                    dept = depts.next()
                    print 'Getting: %s' % dept
                except StopIteration:
                    return
                finally:
                    dlock.release()
                output[dept] = get_course_info(dept)
            except Exception, err:
                errors.append((err, traceback.format_exc()))
                return
    threads = [threading.Thread(target=threadfunc) for i in xrange(threadcount)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    if errors:
        errstr = '\n'.join('%s\n%s' % pair for pair in errors)
        raise Exception('Errors occurred fetching data:\n%s' % errstr)
    return output

def main():
    """
        Writes all course information to all_courses.json
    """
    dept_dict = get_course_info_by_dept(get_departments())
    with open('all_data_new.json', 'w') as fobj:
        json.dump(dept_dict, fobj, indent=4, sort_keys=True)

if __name__ == '__main__':
    main()

